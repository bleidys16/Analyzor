import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'

export default function Navbar() {
    const navigate = useNavigate()
    const { user, setToken, setUser } = useStore()

    const handleLogout = () => {
        setToken(null)
        setUser(null)
        navigate('/')
    }

    return (
        <nav style={{
            background: 'white',
            borderBottom: '1px solid #e0e0e0',
            padding: '15px 25px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>ANALYZOR</h1>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                {user && <span>{user.username}</span>}
                <button onClick={handleLogout} style={{
                    padding: '8px 16px',
                    background: '#f0f0f0',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}>
                    Logout
                </button>
            </div>
        </nav>
    )
}