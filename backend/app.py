from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # for dev; later restrict origin

def get_conn():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=int(os.getenv("DB_PORT", "3306")),
    )

@app.get("/api/health")
def health():
    return {"ok": True}
@app.get("/")
def root():
    return {"message": "API running. Try /api/health or /api/customers"}
@app.get("/api/dbtest")
def dbtest():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM customer;")
    (count,) = cur.fetchone()
    cur.close()
    conn.close()
    return {"customer_count": count}

@app.get("/api/customers")
def list_customers():
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("pageSize", 25))
    customer_id = request.args.get("customer_id")
    first_name = request.args.get("first_name")
    last_name = request.args.get("last_name")

    offset = (page - 1) * page_size

    where = []
    params = []

    if customer_id:
        where.append("customer_id = %s")
        params.append(customer_id)
    if first_name:
        where.append("first_name LIKE %s")
        params.append(f"%{first_name}%")
    if last_name:
        where.append("last_name LIKE %s")
        params.append(f"%{last_name}%")

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    cur.execute(f"SELECT COUNT(*) AS total FROM customer {where_sql}", params)
    total = cur.fetchone()["total"]

    cur.execute(
        f"""
        SELECT customer_id, store_id, first_name, last_name, email, address_id, active
        FROM customer
        {where_sql}
        ORDER BY customer_id
        LIMIT %s OFFSET %s
        """,
        params + [page_size, offset],
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({"items": rows, "total": total, "page": page, "pageSize": page_size})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
