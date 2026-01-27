from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE general_config ADD COLUMN IF NOT EXISTS custom_logo_url VARCHAR(500)"))
            conn.commit()
            print("Column added successfully (or already exists)")
        except Exception as e:
            print(f"Error adding column: {e}")
            # Try to print more info about current schema
            try:
                result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='general_config'"))
                print("Existing columns:", [row[0] for row in result])
            except:
                pass

if __name__ == "__main__":
    migrate()
