import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import logo from '../assets/logo.png'; 

export default function Layout() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                {/* Logo Placeholder */}
                                <span className="text-2xl font-bold text-blue-600">⚡ San Vicente</span>
                                {/* <img className="h-8 w-auto" src={logo} alt="Logo" /> */}
                            </div>
                            <Link to="/" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium">
                                Expedientes
                            </Link>
                            {user?.role === 'ADMIN' && (
                                <Link to="/admin/users" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-purple-500 text-sm font-medium">
                                    Usuarios
                                </Link>
                            )}
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-700 mr-4">{user?.name}</span>
                            <button
                                onClick={logout}
                                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="py-6">
                <main>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
