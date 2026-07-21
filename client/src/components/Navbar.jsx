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
            <Link to="/history" className="btn nav-btn">History</Link>
            <button onClick={handleLogout} className="btn nav-btn">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn nav-btn">Log in</Link>
            <Link to="/register" className="btn nav-btn">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
