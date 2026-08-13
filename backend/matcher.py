import json
def normalize_skill(skill):
    skill = skill.lower().strip()

    aliases = {    "postgres database": "postgresql",
    "postgres db": "postgresql",
    "fast api": "fastapi",
    "rest api": "rest",
    "restful api": "rest",
    "amazon web services": "aws",
    "aws cloud": "aws"
    }

    return aliases.get(skill, skill)


with open("test_resume.json", "r") as file:
    resume = json.load(file)

with open("test_job.json", "r") as file:
    job = json.load(file)


resume_skills = {
    normalize_skill(skill)
    for skill in resume.get("skills", [])
}

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
    required_score = 0



if preferred_skills:
    preferred_score = (
        len(matched_preferred) / len(preferred_skills)
    ) * 100
else:
    preferred_score = 0

candidate_experience = resume.get("total_experience", 0)
required_experience = job.get("min_experience", 0)

if required_experience == 0:
    experience_score = 100
else:
    experience_score = min(
        candidate_experience / required_experience * 100,
        100
    )

education = resume.get("education", [])

if education:
    education_score = 100
else:
    education_score = 0


# Calculate final score
final_score = (
    required_score * 0.60
    + preferred_score * 0.15
    + experience_score * 0.15
    + education_score * 0.10
)



print("\n===== JOB MATCH RESULTS =====")

print(f"\nCandidate: {resume.get('name')}")
print(f"Job: {job.get('title')}")
print(f"Company: {job.get('company')}")

print(f"\nMatch Score: {final_score:.1f}%")


print(f"\nRequired Skills: {required_score:.1f}%")
print(f"Preferred Skills: {preferred_score:.1f}%")
print(f"Experience: {experience_score:.1f}%")
print(f"Education: {education_score:.1f}%")
