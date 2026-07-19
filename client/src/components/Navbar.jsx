import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">Interview Prep AI</Link>
      <div className="nav-actions">
        {user ? (
          <>
                        <span className="nav-user">Hi, {user.name}</span>
            <Link to="/history" className="btn btn-ghost">History</Link>
            <button onClick={handleLogout} className="btn btn-ghost">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">Log in</Link>
            <Link to="/register" className="btn btn-primary">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}