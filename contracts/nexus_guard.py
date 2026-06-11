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
                text = response.body.decode("utf-8")
                return text[:1000] # Limit to 1000 characters
            except Exception as e:
                return "ERROR"
                
        try:
            raw_code = gl.eq_principle.strict_eq(_fetch_code)
        except Exception as e:
            raw_code = "ERROR"
        
        if raw_code == "ERROR":
            audit_data = {"url": repo_url, "status": "WARNING", "details": "Failed to fetch code from URL. Please ensure it is a raw text URL (e.g. raw.githubusercontent.com).", "timestamp": "auto"}
            self.audits[repo_url] = json.dumps(audit_data)
            return json.dumps(audit_data)

        prompt = f"""
        You are a strict smart contract security auditor.
        Review this code:
        {raw_code}
        
        Rule 1: Start your response with EXACTLY one word: SECURE, WARNING, or CRITICAL.
        Rule 2: Follow it with exactly one sentence explaining the main risk.
        """
        
        def _analyze_security() -> str:
            return gl.nondet.exec_prompt(prompt)
            
        try:
            analysis_raw = gl.eq_principle.prompt_comparative(
                _analyze_security,
                principle="Both texts must start with the exact same word (SECURE, WARNING, or CRITICAL)."
            )
        except Exception as e:
            # If consensus fails or LLM times out, we catch it so the transaction DOES NOT REVERT!
            analysis_raw = f"WARNING: AI Validators could not reach consensus or timed out. Please try again."
        
        status = "UNKNOWN"
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
