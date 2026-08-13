import { useState } from "react";
import "./App.css";
import qrCode from "./assets/qr-code.png";

const API_URL = "http://192.168.1.20:8000";

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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
    setError("");
  };

  const uploadResume = async () => {
    if (!file) {
      setError("Please choose a resume first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/resume/parse`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Something went wrong while processing the resume."
        );
      }

      setResult(data);
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
    setError("");

    const input = document.getElementById("resume-input");
    if (input) input.value = "";
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
              onClick={() => setShowHowItWorks(true)}> How it works </button>

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

            <h2>{file ? file.name : "Upload your resume"}</h2>

            <p>
              {file
                ? `${formatFileSize(file.size)} • Ready to analyze`
                : "Select your resume to get started"}
            </p>

            <label className="choose-button" htmlFor="resume-input">
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

                <p>Extracting information from your resume...</p>
              </div>
            )}

            {error && <div className="error">⚠ {error}</div>}
          </div>

          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">📄</div>

              <div>
                <h3>Resume Parsing</h3>
                <p>Extract information automatically.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚡</div>

              <div>
                <h3>Fast Analysis</h3>
                <p>Process your resume in seconds.</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>

              <div>
                <h3>Job Matching</h3>
                <p>Find opportunities that fit you.</p>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="results">
          <div className="results-header">
            <div>
              <div className="badge">✓ Resume analyzed</div>

              <h1>
                Resume
                <span> ready.</span>
              </h1>

              <p>{result.filename || file?.name}</p>
            </div>

            <button className="secondary-button" onClick={resetApp}>
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
              <div className="summary-icon">✦</div>

              <div>
                <strong>CareerMatch</strong>
                <p>Ready for analysis</p>
              </div>
            </div>
          </div>

          <div className="resume-card">
            <div className="resume-card-header">
              <div>
                <h2>Extracted Resume</h2>
                <p>Information extracted from your resume</p>
              </div>

              <span className="success">✓ Parsed</span>
            </div>

            <div className="resume-text">
              {result.text || "No extracted text was returned by the backend."}
            </div>
          </div>

          <div className="next-section">
            <h2>Resume successfully parsed 🎉</h2>

            <p>
              Your resume has been extracted successfully. The next step is to
              identify your skills, education, experience and projects and match
              them with relevant jobs.
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
            onClick={(event) => event.stopPropagation()}
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
              If CareerMatch helped you, consider supporting us!
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
            onClick={(event) => event.stopPropagation()}
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
                <div>
                  <strong>Upload Resume</strong>
                  <p>Upload your PDF, DOC, or DOCX resume.</p>
                </div>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <div>
                  <strong>AI Profile Analysis</strong>
                  <p>Extract your skills, experience and education.</p>
                </div>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <div>
                  <strong>Job Matching</strong>
                  <p>Find opportunities that match your profile.</p>
                </div>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <div>
                  <strong>Skill Gap Analysis</strong>
                  <p>Discover the skills you need to improve.</p>
                </div>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step">
                <div>
                  <strong>Mock Interview</strong>
                  <p>Practice interviews and prepare with confidence.</p>
                </div>
              </div>

              <div className="step-arrow">↓</div>

              <div className="how-step"> 
                <div>
                  <strong>Performance Score</strong>
                  <p>Track your readiness and improve your performance.</p>
                </div>
              </div>
            </div>

            <div className="how-final">
              <strong>Get better. Get ready. Get hired.</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

export default App;