#!/usr/bin/env python3
"""
User-Department Many-to-Many Association Table Migration
"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL

def run_migration():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Create user_departments association table
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS user_departments (
                user_id INTEGER NOT NULL,
                department_id INTEGER NOT NULL,
                PRIMARY KEY (user_id, department_id),
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
            );
        """))
        
        # Migrate existing user-department relationships
        # Copy existing department_id relationships to the new table
        connection.execute(text("""
            INSERT INTO user_departments (user_id, department_id)
            SELECT id, department_id 
            FROM users 
            WHERE department_id IS NOT NULL
            ON CONFLICT DO NOTHING;
        """))
        
        connection.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
