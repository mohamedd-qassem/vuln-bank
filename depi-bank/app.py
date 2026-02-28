from flask import Flask, request, jsonify, session, render_template
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import jwt
from functools import wraps

app = Flask(__name__)
app.secret_key = 'depi_bank_super_secret_key'
JWT_SECRET = 'depi_bank_jwt_secret_key_2024'
JWT_EXPIRATION = 7 * 24 * 60 * 60  # 7 days in seconds

# Initialize SQLite DB
def init_db():
    conn = sqlite3.connect('depi_bank.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users 
                 (username TEXT PRIMARY KEY, password TEXT, balance REAL, name TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS transactions 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, date TEXT, desc TEXT, amount REAL)''')
    
    # Add admin if not exists
    c.execute("SELECT * FROM users WHERE username = 'admin'")
    if not c.fetchone():
        admin_pass = generate_password_hash("password123")
        c.execute("INSERT INTO users VALUES (?, ?, ?, ?)", 
                  ("admin", admin_pass, 12450.00, "Admin User"))
        
        # Add initial transactions
        c.execute("INSERT INTO transactions (username, date, desc, amount) VALUES (?, ?, ?, ?)", 
                  ("admin", "Today", "Direct Deposit - Employer", 3200.00))
        c.execute("INSERT INTO transactions (username, date, desc, amount) VALUES (?, ?, ?, ?)", 
                  ("admin", "Yesterday", "Amazon Online Purchase", -142.50))
    
    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    conn = sqlite3.connect('depi_bank.db')
    conn.row_factory = sqlite3.Row
    return conn

# JWT Token Functions
def generate_token(username):
    """Generate a JWT token for the user"""
    payload = {
        'username': username,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRATION),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token

def verify_token(token):
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload.get('username')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"success": False, "message": "Invalid token format"}), 401
        
        if not token:
            return jsonify({"success": False, "message": "Token is missing"}), 401
        
        username = verify_token(token)
        if not username:
            return jsonify({"success": False, "message": "Invalid or expired token"}), 401
        
        request.username = username
        return f(*args, **kwargs)
    
    return decorated

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/register')
def register_page():
    # simple page for creating an account
    return render_template('register.html')


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if user:
        if check_password_hash(user['password'], password):
            token = generate_token(username)
            return jsonify({
                "success": True, 
                "message": "Login successful",
                "token": token,
                "username": username
            })
        else:
            return jsonify({"success": False, "message": "Invalid credentials"}), 401
    else:
        # Create new user (auto-account creation)
        hashed_pass = generate_password_hash(password)
        conn = get_db_connection()
        try:
            conn.execute("INSERT INTO users VALUES (?, ?, ?, ?)", 
                         (username, hashed_pass, 500.00, username))
            conn.commit()
            token = generate_token(username)
            return jsonify({
                "success": True, 
                "message": "Account created and logged in",
                "token": token,
                "username": username
            })
        except sqlite3.IntegrityError:
            return jsonify({"success": False, "message": "Username already exists"}), 400
        finally:
            conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    # JWT tokens are stateless, so logout is handled on client side
    return jsonify({"success": True, "message": "Logout successful"})

@app.route('/api/dashboard', methods=['GET'])
@token_required
def dashboard():
    username = request.username
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    transactions = conn.execute("SELECT date, desc, amount FROM transactions WHERE username = ? ORDER BY id DESC", 
                                (username,)).fetchall()
    conn.close()

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    is_admin = username == 'admin'
    
    return jsonify({
        "success": True,
        "name": user['name'],
        "balance": user['balance'],
        "is_admin": is_admin,
        "transactions": [dict(tx) for tx in transactions]
    })

@app.route('/api/transfer', methods=['POST'])
@token_required
def transfer():
    data = request.get_json() or {}
    username = request.username
    try:
        amount = float(data.get('amount', 0))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Invalid amount"}), 400

    recipient = data.get('recipient')
    if not recipient:
        return jsonify({"success": False, "message": "Recipient required"}), 400

    if recipient == username:
        return jsonify({"success": False, "message": "Cannot transfer to yourself"}), 400

    desc = data.get('desc') or f"Transfer to {recipient}"

    if amount <= 0:
        return jsonify({"success": False, "message": "Invalid amount"}), 400

    conn = get_db_connection()
    sender = conn.execute("SELECT balance FROM users WHERE username = ?", (username,)).fetchone()
    recipient_user = conn.execute("SELECT balance FROM users WHERE username = ?", (recipient,)).fetchone()

    if sender['balance'] < amount:
        conn.close()
        return jsonify({"success": False, "message": "Insufficient funds"}), 400

    if not recipient_user:
        conn.close()
        return jsonify({"success": False, "message": "Recipient not found"}), 404

    new_sender_balance = sender['balance'] - amount
    conn.execute("UPDATE users SET balance = ? WHERE username = ?", (new_sender_balance, username))
    
    new_recipient_balance = recipient_user['balance'] + amount
    conn.execute("UPDATE users SET balance = ? WHERE username = ?", (new_recipient_balance, recipient))
    
    date_str = datetime.now().strftime("%b %d, %Y")
    conn.execute("INSERT INTO transactions (username, date, desc, amount) VALUES (?, ?, ?, ?)", 
                 (username, date_str, desc, -amount))
    
    recipient_desc = f"Transfer from {username}"
    conn.execute("INSERT INTO transactions (username, date, desc, amount) VALUES (?, ?, ?, ?)", 
                 (recipient, date_str, recipient_desc, amount))
    
    conn.commit()
    conn.close()

    return jsonify({"success": True, "new_balance": new_sender_balance})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    name = data.get('name', username)

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"}), 400

    if len(username) < 3:
        return jsonify({"success": False, "message": "Username too short"}), 400
    if len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters"}), 400

    conn = get_db_connection()
    existing = conn.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone()

    if existing:
        conn.close()
        return jsonify({"success": False, "message": "Username already exists"}), 409

    hashed = generate_password_hash(password)
    try:
        conn.execute("INSERT INTO users (username, password, balance, name) VALUES (?, ?, ?, ?)",
                     (username, hashed, 500.00, name))
        conn.commit()
        token = generate_token(username)
        return jsonify({
            "success": True, 
            "message": "Account created successfully",
            "token": token,
            "username": username
        })
    except Exception:
        conn.rollback()
        return jsonify({"success": False, "message": "Error creating account"}), 500
    finally:
        conn.close()

@app.route('/api/transactions', methods=['GET'])
@token_required
def get_transactions():
    username = request.username
    limit = request.args.get('limit', 0, type=int)
    
    conn = get_db_connection()
    
    if limit > 0:
        transactions = conn.execute(
            "SELECT date, desc, amount FROM transactions WHERE username = ? ORDER BY id DESC LIMIT ?", 
            (username, limit)
        ).fetchall()
    else:
        transactions = conn.execute(
            "SELECT date, desc, amount FROM transactions WHERE username = ? ORDER BY id DESC", 
            (username,)
        ).fetchall()
    
    conn.close()
    
    return jsonify({
        "success": True,
        "transactions": [dict(tx) for tx in transactions]
    })

@app.route('/api/change_password', methods=['POST'])
@token_required
def change_password():
    data = request.get_json()
    username = request.username
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({"success": False, "message": "Passwords required"}), 400
    
    if len(new_password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters"}), 400
    
    conn = get_db_connection()
    user = conn.execute("SELECT password FROM users WHERE username = ?", (username,)).fetchone()
    
    if not user:
        conn.close()
        return jsonify({"success": False, "message": "User not found"}), 404
    
    if not check_password_hash(user['password'], current_password):
        conn.close()
        return jsonify({"success": False, "message": "Current password is incorrect"}), 401
    
    hashed_new = generate_password_hash(new_password)
    conn.execute("UPDATE users SET password = ? WHERE username = ?", (hashed_new, username))
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Password changed successfully"})

# Admin Endpoints
@app.route('/api/admin/users', methods=['GET'])
@token_required
def admin_get_users():
    if request.username != 'admin':
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    conn = get_db_connection()
    users = conn.execute("SELECT username, balance, name FROM users ORDER BY username").fetchall()
    
    # Calculate stats
    total_balance = sum([u['balance'] for u in users])
    user_count = len(users)
    
    conn.close()
    
    return jsonify({
        "success": True,
        "users": [dict(u) for u in users],
        "total_balance": total_balance,
        "user_count": user_count
    })

@app.route('/api/admin/transactions', methods=['GET'])
@token_required
def admin_get_transactions():
    if request.username != 'admin':
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    conn = get_db_connection()
    transactions = conn.execute("SELECT username, date, desc, amount FROM transactions ORDER BY id DESC").fetchall()
    
    # Format transactions to include from_user and to_user
    formatted_transactions = []
    for t in transactions:
        if t['amount'] < 0:
            # This is a sent transaction
            from_user = t['username']
            to_user = t['desc'] if not t['desc'].startswith('Transfer from') else 'Unknown'
            # Extract recipient from description if available
            # The description is the recipient name or just the description
            amount = abs(t['amount'])
        else:
            # This is a received transaction
            to_user = t['username']
            # Extract from_user from description (format: "Transfer from {username}")
            if t['desc'].startswith('Transfer from '):
                from_user = t['desc'].replace('Transfer from ', '')
            else:
                from_user = 'Unknown'
            amount = t['amount']
        
        formatted_transactions.append({
            'from_user': from_user,
            'to_user': to_user,
            'amount': amount,
            'date': t['date']
        })
    
    # Calculate stats
    total_volume = sum([t['amount'] for t in transactions])
    transaction_count = len(transactions)
    
    conn.close()
    
    return jsonify({
        "success": True,
        "transactions": formatted_transactions,
        "total_volume": total_volume,
        "transaction_count": transaction_count
    })

@app.route('/api/admin/stats', methods=['GET'])
@token_required
def admin_stats():
    if request.username != 'admin':
        return jsonify({"success": False, "message": "Admin access required"}), 403
    
    conn = get_db_connection()
    
    # Get user statistics
    users = conn.execute("SELECT COUNT(*) as count FROM users").fetchone()
    user_count = users['count']
    
    # Get transaction statistics
    transactions = conn.execute("SELECT COUNT(*) as count, SUM(amount) as total FROM transactions").fetchone()
    transaction_count = transactions['count']
    total_volume = transactions['total'] or 0
    
    # Get total balance across all accounts
    total_balance = conn.execute("SELECT SUM(balance) as total FROM users").fetchone()
    system_balance = total_balance['total'] or 0
    
    conn.close()
    
    return jsonify({
        "success": True,
        "user_count": user_count,
        "transaction_count": transaction_count,
        "total_volume": total_volume,
        "system_balance": system_balance,
        "avg_user_balance": system_balance / user_count if user_count > 0 else 0
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)

if __name__ == '__main__':
    app.run(debug=True, port=5000)