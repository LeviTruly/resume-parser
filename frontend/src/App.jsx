import { useState } from "react";
import "./App.css";
import qrCode from "./assets/qr-code.png";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [jobMatches, setJobMatches] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingError, setMatchingError] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const fileName = selectedFile.name.toLowerCase();

    const validFile = allowedExtensions.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!validFile) {
      setError("Please upload a PDF, DOC, or DOCX file.");
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setJobMatches([]);
    setMatchingError("");
    setError("");
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
          <span>CareerMatch</span>
        </div>

        <div className="nav-links">
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
                accept=".pdf,.doc,.docx"
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
              <div className="loading">
                <div className="loading-bar">
                  <div className="loading-progress"></div>
                </div>

                <p>
                  Extracting information from your resume...
                </p>
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
                          <h4>
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

          <div className="next-section">
            <h2>
              Resume successfully parsed 🎉
            </h2>

            <p>
              Your resume has been extracted successfully.
              CareerMatch has also analyzed your profile
              against available job opportunities.
            </p>
          </div>
        </main>
      )}

      <footer>
        <strong>CareerMatch</strong>
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
              If CareerMatch helped you, consider
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
                  Upload your PDF, DOC, or DOCX resume.
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