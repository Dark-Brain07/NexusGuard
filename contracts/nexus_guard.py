# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class NexusGuard(gl.Contract):
    audits: TreeMap[str, str]
    audit_count: u256

    def __init__(self):
        self.audit_count = u256(0)

    @gl.public.write
    def request_audit(self, repo_url: str) -> str:
        existing = self.audits.get(repo_url)
        if existing is not None:
            return existing

        def _fetch_code() -> str:
            try:
                response = gl.nondet.web.get(repo_url)
                # Truncate to 1500 chars to ensure the LLM doesn't timeout on GenLayer Studionet
                return response.body.decode("utf-8")[:1500] 
            except Exception:
                return "ERROR_FETCHING"
                
        raw_code = gl.eq_principle.strict_eq(_fetch_code)
        
        if raw_code == "ERROR_FETCHING":
            return json.dumps({"status": "FAILED", "findings": "Could not fetch code from URL."})

        prompt = f"""
        You are a smart contract security auditor.
        Review this code snippet:
        {raw_code}
        
        Rules:
        1. You must start your response with EXACTLY ONE of these words: SECURE, WARNING, or CRITICAL.
        2. Provide exactly two sentences explaining why.
        """
        
        def _analyze_security() -> str:
            return gl.nondet.exec_prompt(prompt)
            
        # Simplified principle to guarantee consensus success during the demo
        analysis_raw = gl.eq_principle.prompt_comparative(
            _analyze_security,
            principle="Both responses must be a security review of the provided code and start with SECURE, WARNING, or CRITICAL."
        )
        
        status = "UNKNOWN"
        # Check the first 20 characters to determine the status
        prefix = analysis_raw.upper()[:20]
        if "SECURE" in prefix:
            status = "SECURE"
        elif "WARNING" in prefix:
            status = "WARNING"
        elif "CRITICAL" in prefix:
            status = "CRITICAL"
            
        audit_data = {
            "url": repo_url,
            "status": status,
            "details": analysis_raw,
            "timestamp": "auto-generated"
        }
        
        audit_json = json.dumps(audit_data)
        self.audits[repo_url] = audit_json
        self.audit_count += u256(1)
        
        return audit_json

    @gl.public.view
    def get_audit(self, repo_url: str) -> str:
        data = self.audits.get(repo_url)
        if data is None:
            return "NOT_FOUND"
        return data

    @gl.public.view
    def get_total_audits(self) -> str:
        return str(self.audit_count)
