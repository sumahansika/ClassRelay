
import { useState, useEffect } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {
  const [isLogin, setIsLogin] = useState(true);

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("classrelayUser") || "null")
  );

  const [token, setToken] = useState(
    localStorage.getItem("classrelayToken") || ""
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "CSE",
    subjects: ""
  });

  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    reason: ""
  });

  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [substitutionOffers, setSubstitutionOffers] = useState([]);

  // HOD substitution management states
  const [substitutionRecords, setSubstitutionRecords] = useState([]);
  const [selectedSubstitutionId, setSelectedSubstitutionId] = useState("");
  const [availableCandidates, setAvailableCandidates] = useState([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Common API request function
  const request = async (url, method = "GET", body = null) => {
    const response = await fetch(`${API}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  };

  // Login and Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";

      const body = isLogin
        ? {
            email: form.email,
            password: form.password
          }
        : {
            name: form.name,
            email: form.email,
            password: form.password,
            department: form.department,
            subjects: form.subjects.split(",").map((s) => s.trim())
          };

      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      if (isLogin) {
        localStorage.setItem("classrelayToken", data.token);
        localStorage.setItem("classrelayUser", JSON.stringify(data.faculty));

        setToken(data.token);
        setUser(data.faculty);
        setMessage("Login successful!");
      } else {
        setMessage("Registration successful! Please login.");
        setIsLogin(true);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  // HOD loads pending leave requests
  const loadPendingLeaves = async () => {
    try {
      const data = await request("/leaves/pending");
      setPendingLeaves(data.leaves || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  // HOD loads all substitution records
  const loadSubstitutionRecords = async () => {
    try {
      const data = await request("/substitutions/all");
      setSubstitutionRecords(data.substitutions || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Faculty loads received substitution offers
  const loadMyOffers = async () => {
    try {
      const data = await request("/substitutions/my-offers");
      setSubstitutionOffers(data.offers || []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    if (user && token) {
      if (user.role === "hod") {
        loadPendingLeaves();
        loadSubstitutionRecords();
      } else if (user.role === "faculty") {
        loadMyOffers();
      }
    }
  }, [user, token]);

  // Faculty applies for leave
  const applyLeave = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await request("/leaves/apply", "POST", leaveForm);

      setMessage("Leave request submitted successfully!");

      setLeaveForm({
        startDate: "",
        endDate: "",
        reason: ""
      });
    } catch (error) {
      setMessage(error.message);
    }
  };

  // HOD approves or rejects leave
  const reviewLeave = async (leaveId, status) => {
    try {
      const data = await request(
        `/leaves/review/${leaveId}`,
        "PUT",
        { status }
      );

      if (status === "approved") {
        const count = data.substitutionResult?.createdCount ?? 0;

        setMessage(
          `${data.message}. ${count} substitution records generated.`
        );
      } else {
        setMessage(data.message);
      }

      loadPendingLeaves();
      loadSubstitutionRecords();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // HOD finds available faculty for a substitution
  const findCandidates = async (substitutionId) => {
    try {
      setMessage("");
      setSelectedSubstitutionId(substitutionId);
      setAvailableCandidates([]);

      const data = await request(
        `/substitutions/available/${substitutionId}`
      );

      setAvailableCandidates(data.availableFaculty || []);

      if (!data.availableFaculty?.length) {
        setMessage("No available faculty found for this class.");
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  // HOD sends offer to selected faculty
  const sendOffer = async (substitutionId, facultyId) => {
    try {
      const data = await request(
        `/substitutions/offer/${substitutionId}`,
        "POST",
        { facultyId }
      );

      setMessage(data.message);
      setSelectedSubstitutionId("");
      setAvailableCandidates([]);

      await loadSubstitutionRecords();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Faculty accepts or rejects substitution offer
  const respondToOffer = async (substitutionId, response) => {
    try {
      const data = await request(
        `/substitutions/respond/${substitutionId}`,
        "PUT",
        { response }
      );

      setMessage(data.message);
      loadMyOffers();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("classrelayToken");
    localStorage.removeItem("classrelayUser");

    setToken("");
    setUser(null);
    setPendingLeaves([]);
    setSubstitutionOffers([]);
    setSubstitutionRecords([]);
    setAvailableCandidates([]);
    setSelectedSubstitutionId("");
    setMessage("");
  };

  // Dashboard
  if (user && token) {
    return (
      <div className="app-container">
        <header className="navbar">
          <h2>
            Class<span>Relay</span>
          </h2>

          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </header>

        <main className="dashboard">
          <div className="welcome-card">
            <p className="welcome-label">WELCOME TO CLASSRELAY</p>

            <h1>Hello, {user.name}!</h1>

            <p>
              Your role: <strong>{user.role?.toUpperCase()}</strong>
            </p>

            <p>Department: {user.department}</p>
          </div>

          {message && <p className="message">{message}</p>}

          {/* FACULTY DASHBOARD */}
          {user.role === "faculty" && (
            <>
              {/* Apply for Leave */}
              <section className="feature-card leave-section">
                <h2>Apply for Leave</h2>

                <p>Submit your leave request to the HOD.</p>

                <form onSubmit={applyLeave}>
                  <label>Start Date</label>

                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) =>
                      setLeaveForm({
                        ...leaveForm,
                        startDate: e.target.value
                      })
                    }
                    required
                  />

                  <label>End Date</label>

                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) =>
                      setLeaveForm({
                        ...leaveForm,
                        endDate: e.target.value
                      })
                    }
                    required
                  />

                  <label>Reason for Leave</label>

                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) =>
                      setLeaveForm({
                        ...leaveForm,
                        reason: e.target.value
                      })
                    }
                    placeholder="Enter your reason"
                    required
                  />

                  <button className="submit-btn" type="submit">
                    Submit Leave Request
                  </button>
                </form>
              </section>

              {/* Substitution Offers */}
              <section className="leave-section">
                <h2 className="section-title">
                  My Substitution Offers
                </h2>

                {substitutionOffers.length === 0 ? (
                  <div className="feature-card">
                    <p>No substitution offers received.</p>
                  </div>
                ) : (
                  substitutionOffers.map((offer) => (
                    <div
                      className="feature-card leave-card"
                      key={offer._id}
                    >
                      <h3>New Substitution Offer</h3>

                      <p>
                        <strong>Absent Faculty:</strong>{" "}
                        {offer.absentFaculty?.name || "Faculty"}
                      </p>

                      <p>
                        <strong>Subject:</strong> {offer.subject}
                      </p>

                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(offer.date).toLocaleDateString()}
                      </p>

                      <p>
                        <strong>Day:</strong> {offer.dayOfWeek}
                      </p>

                      <p>
                        <strong>Period:</strong> {offer.period}
                      </p>

                      <p>
                        <strong>Time:</strong>{" "}
                        {offer.startTime} - {offer.endTime}
                      </p>

                      <p>
                        <strong>Room:</strong> {offer.room}
                      </p>

                      <div className="action-buttons">
                        <button
                          className="approve-btn"
                          onClick={() =>
                            respondToOffer(offer._id, "accepted")
                          }
                        >
                          Accept
                        </button>

                        <button
                          className="reject-btn"
                          onClick={() =>
                            respondToOffer(offer._id, "rejected")
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </>
          )}

          {/* HOD DASHBOARD */}
          {user.role === "hod" && (
            <>
              {/* Pending Leave Requests */}
              <section className="leave-section">
                <h2 className="section-title">
                  Pending Leave Requests
                </h2>

                {pendingLeaves.length === 0 ? (
                  <div className="feature-card">
                    <p>No pending leave requests.</p>
                  </div>
                ) : (
                  pendingLeaves.map((leave) => (
                    <div
                      className="feature-card leave-card"
                      key={leave._id}
                    >
                      <h3>{leave.faculty?.name || "Faculty"}</h3>

                      <p>
                        <strong>Department:</strong>{" "}
                        {leave.faculty?.department}
                      </p>

                      <p>
                        <strong>From:</strong>{" "}
                        {new Date(leave.startDate).toLocaleDateString()}
                      </p>

                      <p>
                        <strong>To:</strong>{" "}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </p>

                      <p>
                        <strong>Reason:</strong> {leave.reason}
                      </p>

                      <div className="action-buttons">
                        <button
                          className="approve-btn"
                          onClick={() =>
                            reviewLeave(leave._id, "approved")
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="reject-btn"
                          onClick={() =>
                            reviewLeave(leave._id, "rejected")
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* Substitution Management */}
              <section className="leave-section">
                <div className="section-heading">
                  <h2 className="section-title">
                    Substitution Management
                  </h2>

                  <button
                    className="submit-btn"
                    onClick={loadSubstitutionRecords}
                  >
                    Refresh Records
                  </button>
                </div>

                {substitutionRecords.length === 0 ? (
                  <div className="feature-card">
                    <p>No substitution records available.</p>
                  </div>
                ) : (
                  substitutionRecords.map((record) => (
                    <div
                      className="feature-card leave-card"
                      key={record._id}
                    >
                      <h3>{record.subject}</h3>

                      <p>
                        <strong>Absent Faculty:</strong>{" "}
                        {record.absentFaculty?.name || "Faculty"}
                      </p>

                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(record.date).toLocaleDateString()}
                      </p>

                      <p>
                        <strong>Day:</strong> {record.dayOfWeek}
                      </p>

                      <p>
                        <strong>Period:</strong> {record.period}
                      </p>

                      <p>
                        <strong>Time:</strong>{" "}
                        {record.startTime} - {record.endTime}
                      </p>

                      <p>
                        <strong>Room:</strong> {record.room}
                      </p>

                      <p>
                        <strong>Status:</strong>{" "}
                        <span className="status-text">
                          {record.status?.toUpperCase()}
                        </span>
                      </p>

                      {record.offeredTo && (
                        <p>
                          <strong>Offer sent to:</strong>{" "}
                          {record.offeredTo.name}
                        </p>
                      )}

                      {record.substituteFaculty && (
                        <p>
                          <strong>Assigned Faculty:</strong>{" "}
                          {record.substituteFaculty.name}
                        </p>
                      )}

                      {["pending", "rejected"].includes(record.status) && (
                        <button
                          className="submit-btn"
                          onClick={() => findCandidates(record._id)}
                        >
                          Find Available Faculty
                        </button>
                      )}

                      {/* Available faculty list */}
                      {selectedSubstitutionId === record._id && (
                        <div className="candidate-section">
                          <h3>Available Faculty (Lowest Workload First)</h3>

                          {availableCandidates.length === 0 ? (
                            <p>
                              No available faculty found for this class.
                            </p>
                          ) : (
                            availableCandidates.map((candidate) => (
                              <div
                                className="candidate-card"
                                key={candidate._id}
                              >
                                <p>
                                  <strong>Name:</strong> {candidate.name}
                                </p>

                                <p>
                                  <strong>Email:</strong> {candidate.email}
                                </p>

                                <p>
                                  <strong>Workload:</strong>{" "}
                                  {candidate.workload}
                                </p>

                                <button
                                  className="approve-btn"
                                  onClick={() =>
                                    sendOffer(record._id, candidate._id)
                                  }
                                >
                                  Send Offer
                                </button>
                              </div>
                            ))
                          )}

                          <button
                            className="reject-btn"
                            onClick={() => {
                              setSelectedSubstitutionId("");
                              setAvailableCandidates([]);
                            }}
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </section>
            </>
          )}

          <p className="dashboard-note">
            ClassRelay – Smart Faculty Leave and Substitution Management System
          </p>
        </main>
      </div>
    );
  }

  // LOGIN AND REGISTRATION PAGE
  return (
    <div className="app-container">
      <header className="navbar">
        <h2>
          Class<span>Relay</span>
        </h2>

        <p>Smart Campus Management</p>
      </header>

      <main className="auth-container">
        <div className="auth-info">
          <p className="welcome-label">
            SMART CAMPUS MANAGEMENT
          </p>

          <h1>Faculty Leave & Substitution Management</h1>

          <p>
            Simplifying faculty leave management and ensuring
            uninterrupted academic schedules.
          </p>
        </div>

        <div className="auth-card">
          <h2>
            {isLogin ? "Welcome Back!" : "Create Account"}
          </h2>

          <p className="auth-subtitle">
            {isLogin
              ? "Login to access your dashboard"
              : "Register as a faculty member"}
          </p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <label>Full Name</label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />

                <label>Department</label>

                <input
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  required
                />

                <label>Subjects</label>

                <input
                  name="subjects"
                  value={form.subjects}
                  onChange={handleChange}
                  placeholder="Java, Python"
                  required
                />
              </>
            )}

            <label>Email Address</label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label>Password</label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />

            <button
              className="submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isLogin
                ? "Login"
                : "Register"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}

          <p className="switch-text">
            {isLogin
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage("");
              }}
            >
              {isLogin ? " Register" : " Login"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
