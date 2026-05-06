from backend.app.db.base import Base
from backend.app.db.session import engine
from backend.app.models.auction import Auction
from backend.app.models.auto_bid import AutoBid
from backend.app.models.bid import Bid
from backend.app.models.category import Category
from backend.app.models.security_incident import SecurityIncident
from backend.app.models.seller_request import SellerRequest
from backend.app.models.user import User
from backend.app.models.watchlist import Watchlist


def ensure_user_role_values():
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_type
                    WHERE typname = 'userrole'
                ) THEN
                    ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'bidder';
                    ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'seller';
                    ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin';
                    ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'defender';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_name = 'users'
                ) THEN
                    ALTER TABLE users
                    ALTER COLUMN role SET DEFAULT 'bidder';
                END IF;
            END
            $$;
            """
        )


def ensure_auction_status_values():
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_type
                    WHERE typname = 'auctionstatus'
                ) THEN
                    ALTER TYPE auctionstatus ADD VALUE IF NOT EXISTS 'upcoming';
                    ALTER TYPE auctionstatus ADD VALUE IF NOT EXISTS 'active';
                    ALTER TYPE auctionstatus ADD VALUE IF NOT EXISTS 'ended';
                    ALTER TYPE auctionstatus ADD VALUE IF NOT EXISTS 'cancelled';
                END IF;
            END
            $$;
            """
        )


def ensure_auction_category_column():
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            ALTER TABLE auctions
            ADD COLUMN IF NOT EXISTS category_id INTEGER;

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM auctions
                    WHERE category_id IS NULL
                ) THEN
                    INSERT INTO categories (name)
                    VALUES ('Uncategorized')
                    ON CONFLICT (name) DO NOTHING;

                    UPDATE auctions
                    SET category_id = (
                        SELECT id
                        FROM categories
                        ORDER BY id
                        LIMIT 1
                    )
                    WHERE category_id IS NULL;
                END IF;
            END
            $$;

            ALTER TABLE auctions
            ALTER COLUMN category_id SET NOT NULL;

            CREATE INDEX IF NOT EXISTS ix_auctions_category_id
            ON auctions (category_id);

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'auctions_category_id_fkey'
                ) THEN
                    ALTER TABLE auctions
                    ADD CONSTRAINT auctions_category_id_fkey
                    FOREIGN KEY (category_id) REFERENCES categories(id);
                END IF;
            END
            $$;
            """
        )


def ensure_bidding_engine_columns():
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            ALTER TABLE auctions
            ADD COLUMN IF NOT EXISTS extension_count INTEGER NOT NULL DEFAULT 0;

            ALTER TABLE bids
            ADD COLUMN IF NOT EXISTS is_auto BOOLEAN NOT NULL DEFAULT FALSE;

            CREATE INDEX IF NOT EXISTS ix_bids_auction_created_at
            ON bids (auction_id, created_at DESC);

            CREATE INDEX IF NOT EXISTS ix_auto_bids_auction_active
            ON auto_bids (auction_id, is_active);
            """
        )


def ensure_user_risk_columns():
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS cumulative_risk_score FLOAT NOT NULL DEFAULT 0.0;

            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_suspected BOOLEAN NOT NULL DEFAULT FALSE;
            """
        )


def init_db():
    ensure_user_role_values()
    ensure_auction_status_values()
    Base.metadata.create_all(bind=engine)
    ensure_auction_category_column()
    ensure_bidding_engine_columns()
    ensure_user_risk_columns()
