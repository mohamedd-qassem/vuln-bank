from flask import Flask, request, jsonify, session, render_template
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'depi_bank_super_secret_key'

db_users = {
    "admin": {"password": "password123", "balance": 12450.00, "name": "Admin User"}
}

db_transactions = {
    "admin": [
        {"date": "Today", "desc": "Direct Deposit - Employer", "amount": 3200.00},
        {"date": "Yesterday", "desc": "Amazon Online Purchase", "amount": -142.50}
    ]
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')

    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400

    if username not in db_users:
        db_users[username] = {
            "password": "any", 
            "balance": 500.00,
            "name": username
        }
        db_transactions[username] = []

    session['user'] = username 
    return jsonify({"success": True, "message": "Login successful"})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"success": True})

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    if 'user' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    username = session['user']
    user_data = db_users[username]
    user_tx = db_transactions.get(username, [])

    return jsonify({
        "success": True,
        "name": user_data['name'],
        "balance": user_data['balance'],
        "transactions": user_tx
    })

@app.route('/api/transfer', methods=['POST'])
def transfer():
    if 'user' not in session:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    data = request.get_json()
    username = session['user']
    amount = float(data.get('amount', 0))
    recipient = data.get('recipient')
    desc = data.get('desc') or f"Transfer to {recipient}"

    if amount <= 0:
        return jsonify({"success": False, "message": "Invalid amount"}), 400
    if db_users[username]['balance'] < amount:
        return jsonify({"success": False, "message": "Insufficient funds"}), 400

    db_users[username]['balance'] -= amount
    
    date_str = datetime.now().strftime("%b %d, %Y")
    new_tx = {"date": date_str, "desc": desc, "amount": -amount}
    db_transactions[username].insert(0, new_tx)

    return jsonify({"success": True, "new_balance": db_users[username]['balance']})

if __name__ == '__main__':
    app.run(debug=True, port=5000)