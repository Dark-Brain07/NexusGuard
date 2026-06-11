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
                return response.body.decode("utf-8")[:4000]
            except Exception:
                return "ERROR_FETCHING"
                
        raw_code = gl.eq_principle.strict_eq(_fetch_code)
        
        if raw_code == "ERROR_FETCHING":
            return json.dumps({"status": "FAILED", "findings": "Could not fetch code from URL."})

        prompt = f"""
        You are a world-class Smart Contract Security Auditor for NexusGuard.
        Analyze the following smart contract code for critical vulnerabilities such as Reentrancy, Integer Overflows, Access Control issues, and Logic Flaws.
        
        SMART CONTRACT CODE:
        {raw_code}
        
        Provide a strict vulnerability assessment. 
        If the code is completely safe, output EXACTLY: "SECURE" followed by a short explanation.
        If there are minor or moderate issues, output EXACTLY: "WARNING" followed by a short explanation.
        If there are critical or exploitable vulnerabilities, output EXACTLY: "CRITICAL" followed by a short explanation.
        """
        
        def _analyze_security() -> str:
            return gl.nondet.exec_prompt(prompt)
            
        analysis_raw = gl.eq_principle.prompt_comparative(
            _analyze_security,
            principle="Both analyses must assign the exact same severity level (SECURE, WARNING, or CRITICAL) to the code."
        )
        
        status = "UNKNOWN"
        if "SECURE" in analysis_raw.upper()[:15]:
            status = "SECURE"
        elif "WARNING" in analysis_raw.upper()[:15]:
            status = "WARNING"
        elif "CRITICAL" in analysis_raw.upper()[:15]:
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
