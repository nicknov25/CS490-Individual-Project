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
    try:
        page = int(request.args.get("page", "1"))
        page_size = int(request.args.get("page_size", "20"))
    except ValueError:
        return jsonify({"error": "page and page_size must be integers"}), 400

    if page < 1 or page_size < 1 or page_size > 100:
        return jsonify({"error": "page must be >= 1 and page_size must be between 1 and 100"}), 400

    search = request.args.get("q", "").strip()
    search_type = request.args.get("type", "").strip().lower()

    where_clause = ""
    params = []

    if search:
        if search_type == "customer_id":
            if not search.isdigit():
                return jsonify({"error": "customer_id must be a number"}), 400
            where_clause = "WHERE customer_id = %s"
            params.append(int(search))
        elif search_type == "first_name":
            where_clause = "WHERE first_name LIKE %s"
            params.append(f"%{search}%")
        elif search_type == "last_name":
            where_clause = "WHERE last_name LIKE %s"
            params.append(f"%{search}%")
        else:
            where_clause = "WHERE first_name LIKE %s OR last_name LIKE %s"
            params.extend([f"%{search}%", f"%{search}%"])

    offset = (page - 1) * page_size

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        count_sql = f"SELECT COUNT(*) AS total FROM customer {where_clause}"
        cursor.execute(count_sql, params)
        total = cursor.fetchone()["total"]

        data_sql = f"""
            SELECT customer_id, first_name, last_name, email, address_id, store_id, active, create_date
            FROM customer
            {where_clause}
            ORDER BY customer_id
            LIMIT %s OFFSET %s
        """
        cursor.execute(data_sql, params + [page_size, offset])
        customers = cursor.fetchall()

        return jsonify({
            "data": customers,
            "page": page,
            "page_size": page_size,
            "total": total
        })
    finally:
        cursor.close()
        conn.close()

@app.post("/api/customers")
def add_customer():
    data = request.json or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip() or None
    address_id = data.get("address_id")
    store_id = data.get("store_id", 1)
    active = data.get("active", 1)

    if not first_name or not last_name:
        return jsonify({"error": "first_name and last_name are required"}), 400

    if address_id is None:
        return jsonify({"error": "address_id is required"}), 400

    try:
        address_id = int(address_id)
        store_id = int(store_id)
        active = int(active)
    except ValueError:
        return jsonify({"error": "address_id, store_id, and active must be integers"}), 400

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        insert_sql = """
            INSERT INTO customer (store_id, first_name, last_name, email, address_id, active, create_date, last_update)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        """
        cursor.execute(insert_sql, (store_id, first_name, last_name, email, address_id, active))
        conn.commit()
        return jsonify({"customer_id": cursor.lastrowid})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- NEW ENDPOINTS FOR CUSTOMER MANAGEMENT ---

@app.put("/api/customers/<int:customer_id>")
def update_customer(customer_id):
    data = request.json or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip() or None
    address_id = data.get("address_id")
    store_id = data.get("store_id")
    active = data.get("active")

    if not first_name or not last_name or address_id is None:
        return jsonify({"error": "first_name, last_name, and address_id are required"}), 400

    conn = get_conn()
    cursor = conn.cursor()
    try:
        update_sql = """
            UPDATE customer 
            SET first_name=%s, last_name=%s, email=%s, address_id=%s, store_id=%s, active=%s, last_update=NOW()
            WHERE customer_id=%s
        """
        cursor.execute(update_sql, (first_name, last_name, email, address_id, store_id, active, customer_id))
        conn.commit()
        return jsonify({"message": "Customer updated successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/customers/<int:customer_id>")
def delete_customer(customer_id):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        # Note: This might fail if the customer has rental history due to FK constraints.
        # Handling foreign keys typically requires soft-deletes (active=0) or cascading deletes.
        # Given the requirements, we attempt a delete.
        delete_sql = "DELETE FROM customer WHERE customer_id = %s"
        cursor.execute(delete_sql, (customer_id,))
        conn.commit()
        return jsonify({"message": "Customer deleted successfully"})
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno == 1451: # Foreign key constraint fails
            return jsonify({"error": "Cannot delete customer because they have rental history. Mark them inactive instead."}), 409
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.get("/api/customers/<int:customer_id>/rentals")
def get_customer_rentals(customer_id):
    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
            SELECT r.rental_id, r.rental_date, r.return_date, f.title
            FROM rental r
            JOIN inventory i ON r.inventory_id = i.inventory_id
            JOIN film f ON i.film_id = f.film_id
            WHERE r.customer_id = %s
            ORDER BY r.rental_date DESC
        """
        cursor.execute(sql, (customer_id,))
        rentals = cursor.fetchall()
        return jsonify(rentals)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.put("/api/rentals/<int:rental_id>/return")
def return_movie(rental_id):
    conn = get_conn()
    cursor = conn.cursor()
    try:
        update_sql = "UPDATE rental SET return_date = NOW() WHERE rental_id = %s"
        cursor.execute(update_sql, (rental_id,))
        conn.commit()
        return jsonify({"message": "Movie returned successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- END NEW ENDPOINTS ---

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

@app.get("/api/movies")
def list_movies():
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM film LIMIT 5")
        movies = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(movies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/top_rented_films")
def top_rented_films():
    store_id = 1
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        sql = """
            SELECT f.film_id, f.title, f.description, COUNT(r.rental_id) AS rentals
            FROM film f
            JOIN inventory i ON f.film_id = i.film_id
            JOIN rental r ON i.inventory_id = r.inventory_id
            WHERE i.store_id = %s
            GROUP BY f.film_id
            ORDER BY rentals DESC
            LIMIT 5
        """
        cur.execute(sql, (store_id,))
        films = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(films)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/film/<int:film_id>")
def film_details(film_id):
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        film_sql = """
            SELECT f.film_id, f.title, f.description, f.release_year, f.rating, f.rental_rate, f.length,
                   c.name AS category
            FROM film f
            LEFT JOIN film_category fc ON f.film_id = fc.film_id
            LEFT JOIN category c ON fc.category_id = c.category_id
            WHERE f.film_id = %s
        """
        cur.execute(film_sql, (film_id,))
        film = cur.fetchone()

        actors_sql = """
            SELECT a.actor_id, a.first_name, a.last_name
            FROM actor a
            JOIN film_actor fa ON a.actor_id = fa.actor_id
            WHERE fa.film_id = %s
        """
        cur.execute(actors_sql, (film_id,))
        actors = cur.fetchall()

        cur.close()
        conn.close()
        return jsonify({"film": film, "actors": actors})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/top_actors")
def top_actors():
    store_id = 1
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        sql = """
            SELECT a.actor_id, a.first_name, a.last_name, COUNT(r.rental_id) AS rentals
            FROM actor a
            JOIN film_actor fa ON a.actor_id = fa.actor_id
            JOIN inventory i ON fa.film_id = i.film_id
            JOIN rental r ON i.inventory_id = r.inventory_id
            WHERE i.store_id = %s
            GROUP BY a.actor_id
            ORDER BY rentals DESC
            LIMIT 5
        """
        cur.execute(sql, (store_id,))
        actors = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(actors)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/api/actor/<int:actor_id>")
def actor_details(actor_id):
    store_id = 1
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        actor_sql = """
            SELECT actor_id, first_name, last_name
            FROM actor
            WHERE actor_id = %s
        """
        cur.execute(actor_sql, (actor_id,))
        actor = cur.fetchone()

        films_sql = """
            SELECT f.film_id, f.title, COUNT(r.rental_id) AS rentals
            FROM film f
            JOIN film_actor fa ON f.film_id = fa.film_id
            JOIN inventory i ON f.film_id = i.film_id
            JOIN rental r ON i.inventory_id = r.inventory_id
            WHERE fa.actor_id = %s AND i.store_id = %s
            GROUP BY f.film_id
            ORDER BY rentals DESC
            LIMIT 5
        """
        cur.execute(films_sql, (actor_id, store_id))
        films = cur.fetchall()

        cur.close()
        conn.close()
        return jsonify({"actor": actor, "top_films": films})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)