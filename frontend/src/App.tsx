import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import './index.css';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div>Cargando...</div>;
    if (!user) return <Navigate to="/login" replace />;

    return children;
};

const AdminRoute = ({ children }: { children: JSX.Element }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div>Cargando...</div>;
    if (!user || user.role !== 'ADMIN') return <Navigate to="/" replace />;

    return children;
};

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ExpedienteWizard from './pages/ExpedienteWizard';
import ExpedienteDetail from './pages/ExpedienteDetail';
import TechnicalForms from './pages/TechnicalForms';
import AdminUsers from './pages/AdminUsers';
import SchematicsList from './pages/SchematicsList';
import SchematicEditorPage from './pages/SchematicEditorPage';

import ProjectList from './pages/mechanisms/ProjectList';
import RoomList from './pages/mechanisms/RoomList';
import MechanismCounter from './pages/mechanisms/MechanismCounter';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route index element={<Dashboard />} />
                        <Route path="expedientes/new" element={<ExpedienteWizard />} />
                        <Route path="expedientes/:id" element={<ExpedienteDetail />} />
                        <Route path="expedientes/:id/technical" element={<TechnicalForms />} />

                        {/* Independent Schematics Routes */}
                        <Route path="esquemas" element={<SchematicsList />} />
                        <Route path="esquemas/:id" element={<SchematicEditorPage />} />

                        {/* Mechanisms Routes */}
                        <Route path="mecanismos" element={<ProjectList />} />
                        <Route path="mecanismos/:id" element={<RoomList />} />
                        <Route path="mecanismos/:projectId/room/:roomId" element={<MechanismCounter />} />

                        {/* Admin Routes */}
                        <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
