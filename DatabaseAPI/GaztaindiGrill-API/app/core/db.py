import mysql.connector
from .config import DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

_connection = None

def get_connection():
    """
    Establishes a new connection if one doesn't exist,
    or returns the existing one.
    """
    global _connection
    if _connection is None or not _connection.is_connected():
        print("Connecting to the database...")
        try:
            _connection = mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME,
                autocommit=True,
            )
            if _connection.is_connected():
                print("Successfully connected to MySQL database")
        except mysql.connector.Error as err:
            print(f"Error connecting to database: {err}")
            _connection = None 

    # Ping to make sure the connection alive
    if _connection:
        try:
            _connection.ping(reconnect=True, attempts=1, delay=0)
        except mysql.connector.Error as err:
            print(f"Connection lost, will try to reconnect on next request: {err}")
            _connection = None

    return _connection