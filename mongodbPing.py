import os
import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError

def test_mongodb_connection():
    # 1. Read MONGODB_URI from environment variables.
    # We use a fallback of an empty string to check if the user actually provided one.
    uri = os.environ.get("MONGODB_URI", "")

    if not uri:
        print("ERROR: MONGODB_URI environment variable not found.")
        print("Please set it before running. For example:")
        print("  Windows: $env:MONGODB_URI='mongodb+srv://...'; python mongodbPing.py")
        sys.exit(1)

    print("Attempting to connect to MongoDB Atlas...")

    try:
        # 2. Connect to MongoDB Atlas.
        # The MongoClient does not immediately initiate a network request by default,
        # it just readies the internal engine.
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)

        # 3. Verify the connection with a lightweight ping command.
        # This forces the driver to reach out to the Atlas database and confirm a handshake.
        client.admin.command('ping')
        
        # 4. Print a clear success message.
        print("\nSUCCESS: You are connected to MongoDB Atlas!")
        
    except ConfigurationError as ce:
        # A ConfigurationError usually means the URI is formatted incorrectly.
        print("\nERROR: Configuration issue with your connection string.")
        print(f"Details: {ce}")
    except ConnectionFailure as cf:
        # A ConnectionFailure usually means wrong password, IP whitelist block, or cluster down.
        print("\nERROR: Failed to establish a connection to the server.")
        print(f"Details: {cf}")
    except Exception as e:
        print("\nERROR: An unexpected error occurred.")
        print(f"Details: {e}")
    finally:
        # 5. Close the MongoDB connection.
        # This is good practice to prevent hanging network sockets when the script finishes.
        if 'client' in locals():
            client.close()
            print("Connection closed safely.")

if __name__ == "__main__":
    test_mongodb_connection()
