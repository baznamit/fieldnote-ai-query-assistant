<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Keep the query assistant as independent, session-only requests, not a threaded chat; this matches the assignment's query/answer scope.
- Share validation, JWT verification and AI calls between TanStack server functions and the portable Node entry; this avoids maintaining two implementations.
- Use explicit caller-supplied test JWTs instead of Cloud bearer attachment; the assignment's demo auth is not Cloud account auth.
- Keep gateway helpers and signing code in server-only modules; no private key or model call belongs in the browser.
- Build the backend container from its independent Node entry, not the preview SSR output; the hosted preview targets a different runtime.
