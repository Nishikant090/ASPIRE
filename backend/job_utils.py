"""
job_utils.py - Unified job listing from opportunities + company jobs
Single source of truth for all public job feeds.
"""

from datetime import datetime
from typing import List, Optional

import company_models as cm
import models


def _employment_to_type(employment_type: str) -> str:
    if employment_type == "internship":
        return "internship"
    return "job"


def normalize_opportunity(opp: models.Opportunity) -> dict:
    return {
        "id": opp.id,
        "source": "opportunity",
        "unique_key": f"opp-{opp.id}",
        "title": opp.title,
        "company": opp.company,
        "company_name": opp.company,
        "description": opp.description,
        "skills": opp.skills,
        "location": opp.location,
        "stipend": opp.stipend,
        "salary": opp.stipend,
        "type": opp.type.value if hasattr(opp.type, "value") else opp.type,
        "employment_type": opp.type.value if hasattr(opp.type, "value") else opp.type,
        "logo": opp.logo or "🏢",
        "created_at": opp.created_at.isoformat() if opp.created_at else None,
        "deadline": None,
        "company_id": None,
    }


def normalize_company_job(job: cm.CompanyJob) -> dict:
    emp = job.employment_type.value if hasattr(job.employment_type, "value") else job.employment_type
    company_name = job.company.name if job.company else "Company"
    return {
        "id": job.id,
        "source": "company_job",
        "unique_key": f"cjob-{job.id}",
        "title": job.title,
        "company": company_name,
        "company_name": company_name,
        "description": job.description,
        "skills": job.skills,
        "location": job.location,
        "stipend": job.salary,
        "salary": job.salary,
        "type": _employment_to_type(emp),
        "employment_type": emp,
        "logo": job.company.logo if job.company and job.company.logo else "🏢",
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "deadline": job.deadline,
        "company_id": job.company_id,
        "openings": job.openings,
        "status": job.status.value if hasattr(job.status, "value") else job.status,
    }


def _matches_type(item: dict, type_filter: Optional[str]) -> bool:
    if not type_filter or type_filter == "all":
        return True
    return item["type"] == type_filter


def _matches_search(item: dict, search: Optional[str]) -> bool:
    if not search:
        return True
    q = search.lower()
    haystack = " ".join([
        item.get("title", ""),
        item.get("company_name", ""),
        item.get("skills", ""),
        item.get("location", ""),
        item.get("description", ""),
    ]).lower()
    return q in haystack


def _matches_company(item: dict, company: Optional[str]) -> bool:
    if not company:
        return True
    return company.lower() in item.get("company_name", "").lower()


def get_unified_jobs(
    db,
    *,
    search: Optional[str] = None,
    type_filter: Optional[str] = None,
    company: Optional[str] = None,
    limit: Optional[int] = None,
    include_opportunities: bool = True,
    include_company_jobs: bool = True,
) -> List[dict]:
    """Return merged, sorted job list from both sources."""
    items: List[dict] = []

    if include_opportunities:
        for opp in db.query(models.Opportunity).order_by(models.Opportunity.created_at.desc()).all():
            item = normalize_opportunity(opp)
            if _matches_search(item, search) and _matches_type(item, type_filter) and _matches_company(item, company):
                items.append(item)

    if include_company_jobs:
        query = db.query(cm.CompanyJob).filter(cm.CompanyJob.status == cm.JobStatus.active)
        for job in query.order_by(cm.CompanyJob.created_at.desc()).all():
            item = normalize_company_job(job)
            if _matches_search(item, search) and _matches_type(item, type_filter) and _matches_company(item, company):
                items.append(item)

    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    if limit:
        items = items[:limit]
    return items
