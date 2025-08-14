import mysql.connector
from .config import DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

# Simple module-level connection to avoid over-engineering
_connection = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
)

if _connection.is_connected():
    print("Connected to MySQL database")


def get_connection():
    """Return the shared MySQL connection.
    Keep it simple: one connection during app lifetime, as in the original code.
    """
    return _connection
