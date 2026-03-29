# 🍔 Food Ordering App

A fully responsive, browser-based food ordering platform featuring a customer menu, live shopping cart, and a secure centralized Admin Dashboard backed by MongoDB.

## ✨ Features
- **Dynamic Frontend**: Modern UI with Grid/List layout options for the menu.
- **Live Cart Tracking**: Localized active-session cart tracking and seamless checkout.
- **Admin Dashboard**: A secure portal for restaurant managers to view realtime global orders, track total sales metrics, and finalize shipments.
- **Centralized Engine**: Driven by a single `config.json` control panel.
- **Cloud Database**: Directly integrated with MongoDB Atlas for persistent global storage.

---

## 🚀 How to Run Locally

If you downloaded or cloned this repository from GitHub, follow these exact steps to start the application on your own computer:

### 1. Prerequisites
You must have Python installed on your computer. 
- You can check if Python is installed by typing `python --version` in your terminal.

### 2. Install Dependencies
This project uses a custom lightweight Python backend server that connects directly to MongoDB. You need to install the official MongoDB driver for Python.
Run this command in your terminal inside the project folder:
```bash
pip install pymongo dnspython
```

### 3. Setup your Database
The application requires a live MongoDB Atlas cloud database to store the orders permanently.
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Get your `mongodb+srv://...` Connection String. 
3. **Important**: Make sure you "Whitelist" your IP address (allow `0.0.0.0/0`) in the Atlas **Network Access** panel, otherwise the server cannot connect!

### 4. Configure the Application
Open the `config.json` file in the project folder. This file acts as the master control panel for the app.
- Edit the `WEBSITE_NAME` variable to instantly brand your restaurant globally.
- Paste your secure Atlas connection string into the `MONGODB_URI` field.

*Example `config.json`:*
```json
{
    "WEBSITE_NAME": "My Custom Kitchen",
    "MONGODB_URI": "mongodb+srv://<username>:<password>@cluster.xyz.mongodb.net/?appName=foodApp"
}
```
*(If `config.json` does not exist when you download the folder, the Python server will automatically generate a blank template for you on its first run!)*

### 5. Launch the Server!
Once configured, all you have to do is turn the Python engine on using your terminal:
```bash
python server_mongo.py
```

### 6. Open the App in your Browser
The terminal will display a "SUCCESS" message and your app is now live!
- 🍕 **Customer Menu**: Navigate to `http://localhost:8000`
- 🛡️ **Admin Dashboard**: Navigate to `http://localhost:8000/admin.html` (Use the login form to access)
