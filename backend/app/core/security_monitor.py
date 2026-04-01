import time
from collections import defaultdict

# user_id -> timestamps
request_log = defaultdict(list)

THRESHOLD = 5        # requests
WINDOW = 10          # seconds


def log_request(user_id: int):
    now = time.time()
    request_log[user_id].append(now)

    # clean old entries
    request_log[user_id] = [
        t for t in request_log[user_id]
        if now - t <= WINDOW
    ]

    return len(request_log[user_id])


def is_suspicious(user_id: int):
    return len(request_log[user_id]) > THRESHOLD