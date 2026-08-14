import { useEffect, useState } from "react";
import "./App.css";
import qrCode from "./assets/qr-code.png";

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [jobMatches, setJobMatches] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingError, setMatchingError] = useState("");

  const [view, setView] = useState("candidate");
  const [dbJobs, setDbJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [addJobLoading, setAddJobLoading] = useState(false);
  const [addJobSuccess, setAddJobSuccess] = useState(false);
  const [addJobError, setAddJobError] = useState("");

  const [interviewSessionId, setInterviewSessionId] = useState("");
  const [interviewQuestion, setInterviewQuestion] = useState("");
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState("");
  const [interviewEvaluation, setInterviewEvaluation] = useState(null);
  const [interviewFinished, setInterviewFinished] = useState(false);

  const [newJob, setNewJob] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    min_experience: 0,
    required_skills: "",
    preferred_skills: ""
  });

  const fetchJobs = async () => {
    setJobsLoading(true);
    setJobsError("");
    try {
      const response = await fetch(`${API_URL}/jobs`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to fetch jobs");
      setDbJobs(data.jobs || []);
    } catch (err) {
      setJobsError(err.message || "Failed to fetch jobs");
    } finally {
      setJobsLoading(false);
    }
  };

  const handleAddJobSubmit = async (e) => {
    e.preventDefault();
    setAddJobLoading(true);
    setAddJobError("");
    setAddJobSuccess(false);
    try {
      const response = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newJob)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to post job");
      setAddJobSuccess(true);
      setNewJob({
        title: "",
        company: "",
        location: "",
        description: "",
        min_experience: 0,
        required_skills: "",
        preferred_skills: ""
      });
      fetchJobs();
    } catch (err) {
      setAddJobError(err.message || "Failed to post job");
    } finally {
      setAddJobLoading(false);
    }
  };


  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    const allowedExtensions = [".pdf"];
    const fileName = selectedFile.name.toLowerCase();

    const validFile = allowedExtensions.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!validFile) {
      setError("Please upload a PDF file.");
      setFile(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5 MB.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setJobMatches([]);
    setMatchingError("");
    setError("");
    resetInterview();
  };

  const findJobMatches = async (resumeData) => {
    setMatchingLoading(true);
    setMatchingError("");

    try {
      const response = await fetch(`${API_URL}/jobs/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resume: resumeData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not find matching jobs."
        );
      }

      setJobMatches(data.matches || []);
    } catch (err) {
      console.error("Job matching error:", err);

      setMatchingError(
        err.message || "Could not find matching jobs."
      );
    } finally {
      setMatchingLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      setLoadingStage(0);
      return undefined;
    }

    setLoadingStage(0);

    const timer = setInterval(() => {
      setLoadingStage((stage) => Math.min(stage + 1, 2));
    }, 1700);

    return () => clearInterval(timer);
  }, [loading]);

  const startMockInterview = async () => {
    if (!result?.resume) {
      setInterviewError("Please analyze a resume before starting the mock interview.");
      return;
    }

    setInterviewLoading(true);
    setInterviewError("");
    setInterviewEvaluation(null);
    setInterviewFinished(false);
    setInterviewAnswer("");

    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      const response = await fetch(`${API_URL}/api/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          parsed_resume: JSON.stringify(result.resume),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not start the mock interview.");
      }

      setInterviewSessionId(sessionId);
      setInterviewQuestion(data.question || "");
      setInterviewHistory([
        {
          role: "assistant",
          content: data.question || "",
        },
      ]);
    } catch (err) {
      setInterviewError(
        err.message || "Could not connect to the mock interview service."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  const submitInterviewAnswer = async () => {
    if (!interviewSessionId || !interviewAnswer.trim()) {
      return;
    }

    const answer = interviewAnswer.trim();
    setInterviewLoading(true);
    setInterviewError("");

    try {
      const response = await fetch(`${API_URL}/api/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: interviewSessionId,
          user_answer: answer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not submit your answer.");
      }

      setInterviewHistory((history) => [
        ...history,
        { role: "user", content: answer },
        { role: "assistant", content: data.question || "" },
      ]);
      setInterviewQuestion(data.question || "");
      setInterviewAnswer("");
    } catch (err) {
      setInterviewError(
        err.message || "Could not submit your interview answer."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  const finishMockInterview = async () => {
    if (!interviewSessionId) {
      return;
    }

    setInterviewLoading(true);
    setInterviewError("");

    try {
      const response = await fetch(
        `${API_URL}/api/evaluate?session_id=${encodeURIComponent(
          interviewSessionId
        )}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not evaluate the interview.");
      }

      setInterviewEvaluation(data);
      setInterviewFinished(true);
    } catch (err) {
      setInterviewError(
        err.message || "Could not evaluate the mock interview."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  const resetInterview = () => {
    setInterviewSessionId("");
    setInterviewQuestion("");
    setInterviewAnswer("");
    setInterviewHistory([]);
    setInterviewLoading(false);
    setInterviewError("");
    setInterviewEvaluation(null);
    setInterviewFinished(false);
  };

  const uploadResume = async () => {
    if (!file) {
      setError("Please choose a resume first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setJobMatches([]);
    setMatchingError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/resume/parse`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Something went wrong while processing the resume."
        );
      }

      setResult(data);

      findJobMatches(data.resume);
    } catch (err) {
      if (err.name === "TypeError") {
        setError(
          "Cannot connect to backend. Make sure your FastAPI server is running on port 8000."
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setFile(null);
    setResult(null);
    setJobMatches([]);
    setMatchingError("");
    setError("");
    setLoading(false);
    setLoadingStage(0);
    setMatchingLoading(false);

    const input = document.getElementById("resume-input");

    if (input) {
      input.value = "";
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo" onClick={resetApp}>
          <div className="logo-icon">✦</div>
          <span>AI-resume-parser-and-mock-interviewer</span>
        </div>

        <div className="nav-links">

          <button
            className="add-job-nav-button"
            onClick={() => {
              setView(view === "employer" ? "candidate" : "employer");
              if (view !== "employer") {
                fetchJobs();
              }
            }}
          >
            {view === "employer" ? "← Back to Parse" : "💼 Add Job"}
          </button>

          <button
            className="how-button"
            onClick={() => setShowHowItWorks(true)}
          >
            How it works
          </button>

          <button
            className="coffee-button"
            onClick={() => setShowQR(true)}
          >
            ☕ Buy me a coffee
          </button>
        </div>

      </nav>

      {view === "employer" ? (
        <main className="employer-dashboard">
          <div className="employer-header">
            <div className="badge">
              <span>✦</span>
              Employer Portal
            </div>

            <h1>
              Post jobs,
              <span> find candidates.</span>
            </h1>

            <p className="subtitle">
              Add job opportunities stored in the PostgreSQL database to match with candidate resumes.
            </p>
          </div>

          <div className="employer-grid">
            <div className="post-job-card">
              <h2>Post a New Job</h2>
              <form onSubmit={handleAddJobSubmit} className="job-form">
                <div className="form-group">
                  <label htmlFor="job-title">Job Title *</label>
                  <input
                    id="job-title"
                    type="text"
                    required
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="job-company">Company Name *</label>
                    <input
                      id="job-company"
                      type="text"
                      required
                      value={newJob.company}
                      onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                      placeholder="e.g. Google"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="job-location">Location *</label>
                    <input
                      id="job-location"
                      type="text"
                      required
                      value={newJob.location}
                      onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                      placeholder="e.g. Surat, Gujarat"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="job-exp">Min Experience (Years)</label>
                  <input
                    id="job-exp"
                    type="number"
                    min="0"
                    value={newJob.min_experience}
                    onChange={(e) => setNewJob({ ...newJob, min_experience: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="job-req-skills">Required Skills * (comma-separated)</label>
                  <input
                    id="job-req-skills"
                    type="text"
                    required
                    value={newJob.required_skills}
                    onChange={(e) => setNewJob({ ...newJob, required_skills: e.target.value })}
                    placeholder="e.g. React, Python, PostgreSQL"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="job-pref-skills">Preferred Skills (comma-separated)</label>
                  <input
                    id="job-pref-skills"
                    type="text"
                    value={newJob.preferred_skills}
                    onChange={(e) => setNewJob({ ...newJob, preferred_skills: e.target.value })}
                    placeholder="e.g. Docker, AWS, AI"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="job-desc">Job Description</label>
                  <textarea
                    id="job-desc"
                    rows="4"
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    placeholder="Describe the job requirements and expectations..."
                  />
                </div>

                <button type="submit" className="post-button" disabled={addJobLoading}>
                  {addJobLoading ? "Posting..." : "Post Job Listing →"}
                </button>

                {addJobSuccess && (
                  <p className="success-message-text">✓ Job posted successfully to PostgreSQL database!</p>
                )}

                {addJobError && (
                  <p className="error-message-text">⚠ {addJobError}</p>
                )}
              </form>
            </div>

            <div className="jobs-list-card">
              <h2>Current Openings ({dbJobs.length})</h2>

              {jobsLoading && (
                <div className="jobs-loading">
                  <span className="spinner"></span>
                  Loading jobs from PostgreSQL...
                </div>
              )}

              {jobsError && (
                <div className="error">
                  ⚠ {jobsError}
                </div>
              )}

              {!jobsLoading && !jobsError && dbJobs.length === 0 && (
                <div className="no-jobs">
                  No job postings found. Post one using the form on the left!
                </div>
              )}

              <div className="jobs-list-scroll">
                {dbJobs.map((job) => (
                  <div key={job.job_id} className="employer-job-card">
                    <div className="employer-job-header">
                      <h3>{job.title}</h3>
                      <span className="job-company-tag">{job.company}</span>
                    </div>

                    <p className="job-location-exp">
                      📍 {job.location} • 💼 {job.min_experience} Yrs Min Experience
                    </p>

                    {job.description && (
                      <p className="job-desc-text">{job.description}</p>
                    )}

                    <div className="skills-wrap">
                      <div className="skill-section">
                        <strong>Required Skills:</strong>
                        <div className="skill-tags">
                          {job.required_skills.map((s) => (
                            <span key={s} className="req-skill">{s}</span>
                          ))}
                        </div>
                      </div>

                      {job.preferred_skills?.length > 0 && (
                        <div className="skill-section">
                          <strong>Preferred Skills:</strong>
                          <div className="skill-tags">
                            {job.preferred_skills.map((s) => (
                              <span key={s} className="pref-skill">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <>
          {!result ? (

        <main className="hero">
          <div className="badge">
            <span>✦</span>
            AI-powered resume analysis
          </div>

          <h1>
            Find jobs that
            <span> fit you.</span>
          </h1>

          <p className="subtitle">
            Upload your resume and discover opportunities that match your
            skills and experience.
          </p>

          <div className="upload-card">
            <div className="upload-icon">↑</div>

            <h2>
              {file ? file.name : "Upload your resume"}
            </h2>

            <p>
              {file
                ? `${formatFileSize(file.size)} • Ready to analyze`
                : "Select your resume to get started"}
            </p>

            <label
              className="choose-button"
              htmlFor="resume-input"
            >
              {file ? "Choose another" : "Choose Resume"}

              <input
                id="resume-input"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                hidden
              />
            </label>

            {file && (
              <button
                className="analyze-button"
                onClick={uploadResume}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>Analyze Resume →</>
                )}
              </button>
            )}

            {loading && (
              <div className="resume-loading">
                <div className="resume-loading-orb">
                  <div className="resume-loading-orb-core">✦</div>
                </div>

                <div className="resume-loading-heading">
                  Analyzing your resume
                  <span className="resume-loading-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>

                <div className="resume-loading-steps">
                  {[
                    {
                      icon: "🔍",
                      title: "Reading your resume",
                    },
                    {
                      icon: "🧠",
                      title: "Understanding your skills",
                    },
                    {
                      icon: "🎯",
                      title: "Finding compatible opportunities",
                    },
                  ].map((step, index) => {
                    const isComplete = index < loadingStage;
                    const isActive = index === loadingStage;

                    return (
                      <div
                        key={step.title}
                        className={`resume-loading-step ${
                          isActive ? "is-active" : ""
                        } ${isComplete ? "is-complete" : ""}`}
                      >
                        <div className="resume-loading-icon">
                          {isComplete ? "✓" : step.icon}
                        </div>

                        <div className="resume-loading-label">
                          {step.title}
                        </div>

                        <div className="resume-loading-status">
                          {isComplete ? "Done" : isActive ? "Working" : "Next"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="resume-loading-bar">
                  <div
                    className="resume-loading-progress"
                    style={{
                      width: `${Math.min(94, 20 + loadingStage * 34)}%`,
                    }}
                  />
                </div>

                <div className="resume-loading-message">
                  {loadingStage === 0
                    ? "Scanning every section of your resume..."
                    : loadingStage === 1
                    ? "Building a clearer picture of your profile..."
                    : "Almost there — checking your best opportunities..."}
                </div>
              </div>
            )}

            {error && (
              <div className="error">
                ⚠ {error}
              </div>
            )}
          </div>

          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">📄</div>

              <div>
                <h3>Resume Parsing</h3>
                <p>
                  Extract information automatically.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>

              <div>
                <h3>Fast Analysis</h3>
                <p>
                  Process your resume in seconds.
                </p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>

              <div>
                <h3>Job Matching</h3>
                <p>
                  Find opportunities that fit you.
                </p>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="results">
          <div className="results-header">
            <div>
              <div className="badge">
                ✓ Resume analyzed
              </div>

              <h1>
                Resume
                <span> ready.</span>
              </h1>

              <p>
                {result.filename || file?.name}
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={resetApp}
            >
              ← Upload another
            </button>
          </div>

          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-icon">📄</div>

              <div>
                <strong>Resume</strong>
                <p>Successfully uploaded</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">✓</div>

              <div>
                <strong>Status</strong>
                <p>Successfully parsed</p>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">🎯</div>

              <div>
                <strong>Job Matching</strong>
                <p>
                  {matchingLoading
                    ? "Finding matches..."
                    : `${jobMatches.length} matches found`}
                </p>
              </div>
            </div>
          </div>

          <div className="resume-card">
            <div className="resume-card-header">
              <div>
                <h2>Extracted Resume</h2>
                <p>
                  Information extracted from your resume
                </p>
              </div>

              <span className="success">
                ✓ Parsed
              </span>
            </div>

            <div className="resume-text">
              {result.resume ? (
                <div className="parsed-resume">
                  <section>
                    <h3>Personal Information</h3>

                    <p>
                      <strong>Name:</strong>{" "}
                      {result.resume.personal_info?.name ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>Course:</strong>{" "}
                      {result.resume.personal_info?.course ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>Email:</strong>{" "}
                      {result.resume.personal_info?.email ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>Phone:</strong>{" "}
                      {result.resume.personal_info?.phone ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>GitHub:</strong>{" "}
                      {result.resume.personal_info?.github ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>LinkedIn:</strong>{" "}
                      {result.resume.personal_info?.linkedin ||
                        "N/A"}
                    </p>
                  </section>

                  <section>
                    <h3>Education</h3>

                    {result.resume.education?.length ? (
                      result.resume.education.map(
                        (item, index) => (
                          <div
                            className="resume-entry"
                            key={index}
                          >
                            <p>
                              <strong>
                                {item.degree ||
                                  "Education"}
                              </strong>
                            </p>

                            {item.institution && (
                              <p>
                                {item.institution}
                              </p>
                            )}

                            {item.location && (
                              <p>
                                {item.location}
                              </p>
                            )}

                            {item.duration && (
                              <p>
                                {item.duration}
                              </p>
                            )}

                            {item.grade && (
                              <p>
                                Grade: {item.grade}
                              </p>
                            )}

                            {item.details && (
                              <p>
                                {item.details}
                              </p>
                            )}
                          </div>
                        )
                      )
                    ) : (
                      <p>N/A</p>
                    )}
                  </section>

                  <section>
                    <h3>Experience</h3>

                    {result.resume.experience?.length ? (
                      result.resume.experience.map(
                        (item, index) => (
                          <div
                            className="resume-entry"
                            key={index}
                          >
                            <p>
                              <strong>
                                {item.role || "Role"}
                              </strong>
                            </p>

                            {item.company && (
                              <p>
                                {item.company}
                              </p>
                            )}

                            {item.location && (
                              <p>
                                {item.location}
                              </p>
                            )}

                            {item.duration && (
                              <p>
                                {item.duration}
                              </p>
                            )}

                            {item.employment_type && (
                              <p>
                                {item.employment_type}
                              </p>
                            )}

                            {item.responsibilities?.length >
                              0 && (
                              <ul>
                                {item.responsibilities.map(
                                  (
                                    responsibility,
                                    responsibilityIndex
                                  ) => (
                                    <li
                                      key={
                                        responsibilityIndex
                                      }
                                    >
                                      {responsibility}
                                    </li>
                                  )
                                )}
                              </ul>
                            )}
                          </div>
                        )
                      )
                    ) : (
                      <p>N/A</p>
                    )}
                  </section>

                  <section>
                    <h3>Projects</h3>

                    {result.resume.projects?.length ? (
                      result.resume.projects.map(
                        (item, index) => (
                          <div
                            className="resume-entry"
                            key={index}
                          >
                            <p>
                              <strong>
                                {item.name ||
                                  "Project"}
                              </strong>
                            </p>

                            {item.description && (
                              <p>
                                {item.description}
                              </p>
                            )}
                          </div>
                        )
                      )
                    ) : (
                      <p>N/A</p>
                    )}
                  </section>

                  <section>
                    <h3>Technical Skills</h3>

                    <p>
                      <strong>Languages:</strong>{" "}
                      {result.resume.technical_skills
                        ?.languages?.join(", ") ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>
                        Developer Tools:
                      </strong>{" "}
                      {result.resume.technical_skills
                        ?.developer_tools?.join(", ") ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>Frameworks:</strong>{" "}
                      {result.resume.technical_skills
                        ?.frameworks?.join(", ") ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>
                        Cloud / Databases:
                      </strong>{" "}
                      {result.resume.technical_skills
                        ?.cloud_databases?.join(", ") ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>Soft Skills:</strong>{" "}
                      {result.resume.technical_skills
                        ?.soft_skills?.join(", ") ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>Coursework:</strong>{" "}
                      {result.resume.technical_skills
                        ?.coursework?.join(", ") ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>
                        Areas of Interest:
                      </strong>{" "}
                      {result.resume.technical_skills
                        ?.areas_of_interest?.join(", ") ||
                        "N/A"}
                    </p>
                  </section>

                  <section>
                    <h3>Achievements</h3>

                    {result.resume.achievements?.length ? (
                      <ul>
                        {result.resume.achievements.map(
                          (achievement, index) => (
                            <li key={index}>
                              {achievement}
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <p>N/A</p>
                    )}
                  </section>
                </div>
              ) : (
                "No parsed resume data was returned by the backend."
              )}
            </div>
          </div>

          <div className="job-matches-section">
            <div className="job-matches-header">
              <div>
                <div className="badge">
                  🎯 AI job matching
                </div>

                <h2>Jobs that fit you</h2>

                <p>
                  Opportunities ranked using your skills,
                  experience and education.
                </p>
              </div>
            </div>

            {matchingLoading && (
              <div className="matching-loading">
                <span className="matching-spinner"></span>

                <strong>
                  Finding the best jobs for you...
                </strong>

                <p>
                  Comparing your resume with available
                  opportunities.
                </p>
              </div>
            )}

            {matchingError && (
              <div className="error">
                ⚠ {matchingError}
              </div>
            )}

            {!matchingLoading &&
              !matchingError &&
              jobMatches.length > 0 && (
                <div className="job-matches-grid">
                  {jobMatches.map((job, index) => (
                    <div
                      className="job-card"
                      key={job.job_id}
                    >
                      <div className="job-card-header">
                        <div>
                          {index === 0 && (
                            <span className="best-match">
                              Best match
                            </span>
                          )}

                          <h3>{job.title}</h3>

                          <p className="job-company">
                            {job.company}
                          </p>

                          <p className="job-location">
                            📍 {job.location}
                          </p>
                        </div>

                        <div className="match-score">
                          <strong>
                            {job.match_score}%
                          </strong>

                          <span>Match</span>
                        </div>
                      </div>

                      <p className="job-description">
                        {job.description}
                      </p>

                      <div className="job-breakdown">
                        <div>
                          <span>Skills</span>

                          <strong>
                            {
                              job.breakdown
                                ?.required_skills
                            }
                            %
                          </strong>
                        </div>

                        <div>
                          <span>Experience</span>

                          <strong>
                            {
                              job.breakdown
                                ?.experience
                            }
                            %
                          </strong>
                        </div>

                        <div>
                          <span>Education</span>

                          <strong>
                            {
                              job.breakdown
                                ?.education
                            }
                            %
                          </strong>
                        </div>
                      </div>

                      {job.matched_skills?.length >
                        0 && (
                        <div className="job-skills">
                          <h4>
                            ✓ Matching skills
                          </h4>

                          <div className="skill-tags">
                            {job.matched_skills.map(
                              (skill) => (
                                <span key={skill}>
                                  {skill}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {job.missing_skills?.length >
                        0 && (
                        <div className="job-skills missing">
                          <h4 className="missing-title">
                            Skills to improve
                          </h4>

                          <div className="skill-tags">
                            {job.missing_skills.map(
                              (skill) => (
                                <span key={skill}>
                                  {skill}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {!matchingLoading &&
              !matchingError &&
              jobMatches.length === 0 && (
                <div className="matching-empty">
                  No matching jobs were found.
                </div>
              )}
          </div>

          <section className="interview-section">
            <div className="interview-header">
              <div>
                <div className="badge">🎤 AI mock interviewer</div>
                <h2>Practice before the real interview</h2>
                <p>
                  Your interview questions are generated from the resume you
                  just analyzed.
                </p>
              </div>

              {!interviewSessionId && (
                <button
                  className="interview-start-button"
                  onClick={startMockInterview}
                  disabled={interviewLoading}
                >
                  {interviewLoading ? "Starting..." : "Start Mock Interview →"}
                </button>
              )}
            </div>

            {interviewError && (
              <div className="error interview-error">⚠ {interviewError}</div>
            )}

            {interviewSessionId && !interviewFinished && (
              <div className="interview-card">
                <div className="interview-progress">
                  <span>Live interview</span>
                  <span>{interviewHistory.filter((item) => item.role === "user").length} answers</span>
                </div>

                <div className="interview-history">
                  {interviewHistory.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`interview-message ${message.role}`}
                    >
                      <span className="interview-label">
                        {message.role === "assistant" ? "AI Interviewer" : "You"}
                      </span>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </div>

                <div className="interview-answer-box">
                  <textarea
                    value={interviewAnswer}
                    onChange={(e) => setInterviewAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows="5"
                    disabled={interviewLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        submitInterviewAnswer();
                      }
                    }}
                  />

                  <div className="interview-actions">
                    <span>Ctrl/Cmd + Enter to submit</span>
                    <div>
                      <button
                        className="secondary-button"
                        onClick={finishMockInterview}
                        disabled={interviewLoading}
                      >
                        Finish & Evaluate
                      </button>
                      <button
                        className="analyze-button interview-submit-button"
                        onClick={submitInterviewAnswer}
                        disabled={interviewLoading || !interviewAnswer.trim()}
                      >
                        {interviewLoading ? "Thinking..." : "Submit Answer →"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {interviewFinished && interviewEvaluation && (
              <div className="interview-result-card">
                <div className="interview-score">
                  <span>Interview score</span>
                  <strong>{interviewEvaluation.score}%</strong>
                </div>

                <div className="interview-feedback-grid">
                  <div>
                    <h3>Strengths</h3>
                    <ul>
                      {(interviewEvaluation.strengths || []).map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3>Areas to improve</h3>
                    <ul>
                      {(interviewEvaluation.improvements || []).map(
                        (item, index) => (
                          <li key={index}>{item}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>

                <button
                  className="interview-start-button"
                  onClick={resetInterview}
                >
                  Start Another Interview
                </button>
              </div>
            )}
          </section>

          <div className="next-section">
            <h2>
              Resume successfully parsed 🎉
            </h2>

            <p>
              Your resume has been extracted successfully.
              AI-resume-parser-and-mock-interviewer has also analyzed your profile
              against available job opportunities.
            </p>
          </div>
        </main>
          )}
        </>
      )}

      <footer>
        <strong>AI-resume-parser-and-mock-interviewer</strong>
        <span>AI-powered career discovery</span>
      </footer>

      {showQR && (
        <div
          className="qr-overlay"
          onClick={() => setShowQR(false)}
        >
          <div
            className="qr-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="qr-close"
              onClick={() => setShowQR(false)}
            >
              ×
            </button>

            <div className="coffee-icon">☕</div>

            <h2>Buy me a coffee</h2>

            <p>
              If AI-resume-parser-and-mock-interviewer helped you, consider
              supporting us!
            </p>

            <img
              className="qr-code"
              src={qrCode}
              alt="Buy me a coffee QR code"
            />

            <span className="scan-text">
              Scan the QR code to support us
            </span>
          </div>
        </div>
      )}

      {showHowItWorks && (
        <div
          className="how-overlay"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="how-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="how-close"
              onClick={() => setShowHowItWorks(false)}
            >
              ×
            </button>

            <div className="how-header">
              <div className="how-icon">✦</div>

              <h2>How it works</h2>

              <p>
                From your resume to your next opportunity.
              </p>
            </div>

            <div className="how-steps">
              <div className="how-step">
                <strong>Upload Resume</strong>
                <p>
                  Upload your PDF resume.
                </p>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <strong>AI Profile Analysis</strong>
                <p>
                  Extract your skills, experience and
                  education.
                </p>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <strong>Job Matching</strong>
                <p>
                  Find opportunities that match your
                  profile.
                </p>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <strong>Skill Gap Analysis</strong>
                <p>
                  Discover the skills you need to improve.
                </p>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <strong>Mock Interview</strong>
                <p>
                  Practice interviews and prepare with
                  confidence.
                </p>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <strong>Performance Score</strong>
                <p>
                  Track your readiness and improve your
                  performance.
                </p>
              </div>
            </div>

            <div className="how-final">
              <strong>
                Get better. Get ready. Get hired.
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(
    bytes / Math.pow(1024, index)
  ).toFixed(1)} ${units[index]}`;
}

export default App;