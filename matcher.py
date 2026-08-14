def normalize_skill(skill):
    skill = str(skill).lower().strip()

    aliases = {
        "postgres database": "postgresql",
        "postgres db": "postgresql",
        "fast api": "fastapi",
        "rest api": "rest",
        "restful api": "rest",
        "amazon web services": "aws",
        "aws cloud": "aws",
        "microsoft excel": "ms excel",
        "excel": "ms excel",
        "microsoft word": "ms word",
        "word": "ms word",
        "microsoft powerpoint": "ms powerpoint",
        "powerpoint": "ms powerpoint",
        "tally": "tally erp",
        "tally erp 9": "tally erp",
        "accounting": "accounts",
        "accounting and billing": "accounts",
        "salary processing": "payroll",
        "salary": "payroll",
        "epf & esi": "epf",
        "esi compliance": "esi",
        "recruitment coordination": "recruitment",
        "documentation & compliance": "documentation"
    }

    return aliases.get(skill, skill)


def extract_resume_skills(resume):
    skills = set()

    technical_skills = resume.get("technical_skills", {})

    if isinstance(technical_skills, dict):
        for values in technical_skills.values():
            if isinstance(values, list):
                for skill in values:
                    skills.add(normalize_skill(skill))
            elif values:
                skills.add(normalize_skill(values))

    raw_skills = resume.get("skills", [])

    if isinstance(raw_skills, list):
        for skill in raw_skills:
            skills.add(normalize_skill(skill))
    elif isinstance(raw_skills, str):
        for skill in raw_skills.split(","):
            skills.add(normalize_skill(skill))

    soft_skills = resume.get("soft_skills", [])

    if isinstance(soft_skills, list):
        for skill in soft_skills:
            skills.add(normalize_skill(skill))

    return skills


def calculate_experience(resume):
    total_experience = resume.get("total_experience", 0)

    if isinstance(total_experience, (int, float)):
        return total_experience

    experience = resume.get("experience", [])

    if not isinstance(experience, list):
        return 0

    return len(experience)


def match_resume_to_job(resume, job):
    resume_skills = extract_resume_skills(resume)

    required_skills = {
        normalize_skill(skill)
        for skill in job.get("required_skills", [])
    }

    preferred_skills = {
        normalize_skill(skill)
        for skill in job.get("preferred_skills", [])
    }

    matched_required = resume_skills.intersection(required_skills)
    missing_required = required_skills - resume_skills
    matched_preferred = resume_skills.intersection(preferred_skills)

    if required_skills:
        required_score = (
            len(matched_required) / len(required_skills)
        ) * 100
    else:
        required_score = 100

    if preferred_skills:
        preferred_score = (
            len(matched_preferred) / len(preferred_skills)
        ) * 100
    else:
        preferred_score = 100

    candidate_experience = calculate_experience(resume)
    required_experience = job.get("min_experience", 0)

    if required_experience <= 0:
        experience_score = 100
    else:
        experience_score = min(
            candidate_experience / required_experience * 100,
            100
        )

    education = resume.get("education", [])

    if isinstance(education, list) and len(education) > 0:
        education_score = 100
    elif isinstance(education, dict) and education:
        education_score = 100
    else:
        education_score = 0

    final_score = (
        required_score * 0.60
        + preferred_score * 0.15
        + experience_score * 0.15
        + education_score * 0.10
    )

    return {
        "score": round(final_score, 1),
        "required_score": round(required_score, 1),
        "preferred_score": round(preferred_score, 1),
        "experience_score": round(experience_score, 1),
        "education_score": round(education_score, 1),
        "matched_skills": sorted(
            matched_required.union(matched_preferred)
        ),
        "missing_skills": sorted(missing_required)
    }