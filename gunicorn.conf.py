import multiprocessing

# Server socket
# Render will automatically set the PORT environment variable
bind = "0.0.0.0:10000" 

# Worker processes
# This will be (2 * number of CPU cores) + 1
workers = (multiprocessing.cpu_count() * 2) + 1
worker_class = "uvicorn.workers.UvicornWorker"

# Set a long timeout to allow for Gemini API calls
timeout = 180

# Logging
accesslog = "-"
errorlog = "-"
