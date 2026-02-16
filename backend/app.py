from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import mysql.connector
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

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

# EXISTING CUSTOMER ENDPOINT
@app.get("/api/customers")
def list_customers():
    pass 

# NEW FILMS ENDPOINTS

@app.get("/api/films")
def search_films():
    query = request.args.get("q", "")
    search_type = request.args.get("type", "title")  # title, actor, genre
    
    conn = get_conn()
    cursor = conn.cursor(dictionary=True)

    sql = """
        SELECT 
            f.film_id, f.title, f.description, f.release_year, 
            f.rating, c.name as category, f.rental_rate, f.length
        FROM film f
        JOIN film_category fc ON f.film_id = fc.film_id
        JOIN category c ON fc.category_id = c.category_id
    """
    
    params = []
    where_clause = ""

    if search_type == "title":
        where_clause = " WHERE f.title LIKE %s"
        params.append(f"%{query}%")
        
    elif search_type == "genre":
        where_clause = " WHERE c.name LIKE %s"
        params.append(f"%{query}%")

    elif search_type == "actor":
        sql = """
            SELECT 
                f.film_id, f.title, f.description, f.release_year, 
                f.rating, c.name as category, f.rental_rate, f.length
            FROM film f
            JOIN film_category fc ON f.film_id = fc.film_id
            JOIN category c ON fc.category_id = c.category_id
            JOIN film_actor fa ON f.film_id = fa.film_id
            JOIN actor a ON fa.actor_id = a.actor_id
        """
        where_clause = " WHERE a.first_name LIKE %s OR a.last_name LIKE %s"
        params.append(f"%{query}%")
        params.append(f"%{query}%")

    final_sql = sql + where_clause + " LIMIT 50"
    
    cursor.execute(final_sql, params)
    films = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify(films)

@app.post("/api/rent")
def rent_film():
    data = request.json
    film_id = data.get("film_id")
    customer_id = data.get("customer_id")
    staff_id = 1 
    store_id = 1 

    if not film_id or not customer_id:
        return jsonify({"error": "Missing film_id or customer_id"}), 400

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)

    try:
        find_inventory_sql = """
            SELECT i.inventory_id 
            FROM inventory i
            WHERE i.film_id = %s 
            AND i.store_id = %s
            AND i.inventory_id NOT IN (
                SELECT r.inventory_id 
                FROM rental r 
                WHERE r.return_date IS NULL
            )
            LIMIT 1
        """
        cursor.execute(find_inventory_sql, (film_id, store_id))
        inventory_row = cursor.fetchone()

        if not inventory_row:
            return jsonify({"error": "No copies available for rent at this store."}), 409

        inventory_id = inventory_row['inventory_id']

        insert_sql = """
            INSERT INTO rental (rental_date, inventory_id, customer_id, staff_id)
            VALUES (NOW(), %s, %s, %s)
        """
        cursor.execute(insert_sql, (inventory_id, customer_id, staff_id))
        conn.commit()
        
        return jsonify({"message": "Rental successful!", "inventory_id": inventory_id})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    app.run(debug=True, port=5000)