import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div>
      <h2>Admin Panel</h2>
      <Link to="/admin/masters">Masters</Link><br/>
      <Link to="/admin/upload">Upload Paper</Link><br/>
      <Link to="/admin/practical">Practical Marks</Link><br/>
      <Link to="/admin/results">Results</Link>
    </div>
  );
}
