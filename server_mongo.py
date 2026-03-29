import http.server
import socketserver
import json
import sys
from pymongo import MongoClient

# ==============================================================================
# ⚠️ YOUR MONGODB ATLAS CREDENTIALS HERE
# Paste your connection string inside the quotes below. Example:
# "mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
# ==============================================================================
MONGO_URI = "mongodb+srv://abhaygangwalglim:Abhay%4012345@foodordering.n6bqwt3.mongodb.net/?appName=foodOrdering" 
# ==============================================================================

PORT = 8000

print("Initializing MongoDB Atlas connection...")

try:
    if not MONGO_URI:
        print("\n" + "="*60)
        print("ERROR: Missing MongoDB Atlas Connection String!")
        print("Please paste your MONGO_URI in server_mongo.py exactly on line 12!")
        print("="*60 + "\n")
        sys.exit(1)
        
    client = MongoClient(MONGO_URI)
    # Ping the server to verify connection securely before starting HTTP listener
    client.admin.command('ping')
    print("SUCCESS: Connected to MongoDB Atlas Cloud Database!")
    
    # Establish connection to standard Database and Collections internally
    db = client.CraveBitesDB
    orders_collection = db.Orders

except Exception as e:
    print(f"FAILED to connect to MongoDB Atlas Cloud Database: {e}")
    sys.exit(1)


class APIServerHandler(http.server.SimpleHTTPRequestHandler):
    
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header('Content-type', content_type)
        # Avoid caching APIs
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/orders':
            self._set_headers()
            
            # Query the entire Orders collection.
            # MongoDB automatically inserts '_id' which is an ObjectID, not JSON translatable!
            # So we pass {'_id': False} to strip out the mongo-specific tracking ID.
            cursor = orders_collection.find({}, {'_id': False})
            
            # We want newest orders first, just like our raw local solution.
            # Using basic list reversal of retrieved dataset for standard LIFO
            orders = list(cursor)[::-1]
            
            self.wfile.write(json.dumps(orders).encode('utf-8'))
        else:
            # Let the subclass serve standard HTML/JS/CSS index frontends
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/orders':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                new_order = json.loads(post_data.decode('utf-8'))
                
                # Insert if order doesn't exist
                if not orders_collection.find_one({"id": new_order["id"]}):
                    orders_collection.insert_one(new_order)
                    
                self._set_headers(201)
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)

    def do_PATCH(self):
        if self.path.startswith('/api/orders/'):
            order_id = self.path.split('/')[-1]
            content_length = int(self.headers['Content-Length'])
            patch_data = self.rfile.read(content_length)
            
            try:
                updates = json.loads(patch_data.decode('utf-8'))
                
                result = orders_collection.update_one({'id': order_id}, {'$set': updates})
                
                if result.matched_count > 0:
                    self._set_headers(200)
                    self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                else:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({"error": "Order not found"}).encode('utf-8'))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def do_DELETE(self):
        if self.path.startswith('/api/orders/'):
            order_id = self.path.split('/')[-1]
            
            result = orders_collection.delete_one({'id': order_id})
            
            if result.deleted_count > 0:
                self._set_headers(200)
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Order not found"}).encode('utf-8'))


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), APIServerHandler) as httpd:
        print("\nSUCCESS! Listening on http://localhost:" + str(PORT))
        print("Frontend Website & MongoDB Cloud API actively running...")
        httpd.serve_forever()
