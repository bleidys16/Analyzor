from rest_framework.response import Response


class SessionMixin:
    session_error_message = 'X-Session-ID requerido'
    session_error_status = 400

    def get_session_id(self, request):
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            return None
        return session_id

    def require_session_id(self, request):
        session_id = self.get_session_id(request)
        if not session_id:
            return None, Response(
                {'error': self.session_error_message}, status=self.session_error_status
            )
        return session_id, None
