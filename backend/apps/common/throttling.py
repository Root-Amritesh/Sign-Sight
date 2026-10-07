
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

class AuthThrottle(AnonRateThrottle):
    scope = 'auth'

class IngestionThrottle(UserRateThrottle):
    scope = 'ingestion'

class BatchUploadThrottle(UserRateThrottle):
    scope = 'batch_upload'
