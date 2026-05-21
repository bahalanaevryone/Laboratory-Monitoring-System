function User() {
  return (
    <div className="page-container">
      <h1 className="page-title">User Management</h1>
      <div className="user-list">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>Custodian</td>
              <td>john@example.com</td>
              <td>Active</td>
            </tr>
            <tr>
              <td>Jane Smith</td>
              <td>Instructor</td>
              <td>jane@example.com</td>
              <td>Active</td>
            </tr>
            <tr>
              <td>Bob Johnson</td>
              <td>Student</td>
              <td>bob@example.com</td>
              <td>Inactive</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default User;