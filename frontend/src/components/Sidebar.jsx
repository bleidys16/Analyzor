import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
    const location = useLocation()

    const isActive = (path) => location.pathname.startsWith(path)

    const navItems = [
        { label: 'Home', path: '/' },
        { label: 'Datasets', path: '/datasets' },
        { label: 'Editor', path: '/editor' },
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'ML Models', path: '/ml' },
        { label: 'Chat', path: '/chat' },
    ]

    return (
        <aside style={{
            width: '250px',
            background: 'white',
            borderRight: '1px solid #e0e0e0',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }}>
            {navItems.map((item) => (
                <Link
                    key={item.path}
                    to={item.path}
                    style={{
                        padding: '12px 16px',
                        background: isActive(item.path) ? '#f0f0f0' : 'transparent',
                        color: isActive(item.path) ? '#000' : '#666',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontWeight: isActive(item.path) ? 600 : 400,
                    }}
                >
                    {item.label}
                </Link>
            ))}
        </aside>
    )
}