# AWS deployment plan

## Scope

The repository supplies a Node HTTP backend image. The current live preview is hosted on Lovable and uses TanStack typed server functions. The Dockerfile does not attempt to run the preview's serverless SSR output in Node. A full AWS migration also requires wiring the browser to `/session` and `/query` and publishing frontend assets; this is an explicit remaining deployment task, not an already deployed service.

## Container service: ECS Fargate

Use ECR for the image, ECS Fargate for the backend and an Application Load Balancer for HTTPS. Fargate is more configuration than App Runner, but gives explicit control over network exposure, graceful shutdown and request timeouts. Start with one 0.5-vCPU/1-GB task, then measure rather than guessing larger capacity.

1. Build and test the image locally, including `/health`, a request without a JWT (401), an expired JWT (401), invalid input (400) and a real model request. Scan the image and push an immutable commit-tagged image to a private ECR repository.
2. Create an ECS task definition using port 3000 and its non-root user. Supply `LOVABLE_API_KEY` and `JWT_SECRET` through AWS Secrets Manager references, never image layers or checked-in task definitions. Give the execution role permission to read only those secrets and the exact ECR repository.
3. Put tasks in private subnets. Allow inbound traffic only from the ALB security group. Provide outbound HTTPS through NAT for gateway calls. Terminate TLS using ACM at the ALB.
4. Configure the target group's health check as `GET /health`. This is liveness, not an AI call: no model cost or leaked dependency failure. Set the ALB idle timeout based on measured model latency (initially 120 seconds); do not automatically replay generation when a timeout occurs.
5. Send structured metadata to CloudWatch: status, duration and gateway run ID when available, never query text, response content or bearer credentials. Alarm on increasing 5xx, 429, p95 latency and task restarts. Use short log retention for this exercise.
6. Roll out with ECS deployment health checks and retain the previous image for rollback. Rotate signing keys through a planned cutover; the current single-key verifier invalidates existing sessions on rotation.

## Frontend

For a fully container-independent frontend, replace the TanStack server-function calls with the documented same-origin HTTP API, then build static client assets. Publish them on S3 behind CloudFront, with `/api/*` proxied to the ALB and the corresponding prefix mapped to backend paths. This same-origin pattern avoids broad CORS rules and keeps the API key server-only. Alternatively keep the existing hosted UI and its existing server-function backend; do not imply that the standalone backend is automatically used by that UI.

## Before public production exposure

The exercise's public test-session issuer is not production authentication. Replace it with Cognito/OIDC login and verify asymmetric JWTs with cached JWKS, exact issuer and audience. Remove `/session`. Add a durable per-user quota, WAF rate limits, an absolute spend budget, body-size limits at the load balancer/proxy and server, and request auditing without sensitive content. JWT authentication alone does not enforce usage budgets.

No background jobs are present. Model errors are surfaced without automatic retries, avoiding repeated paid generations. The gateway streams upstream, but the HTTP endpoint returns a final answer; for longer requests, forward browser-visible streaming and verify client cancellation reaches the provider before rollout.

## Cost and verification

Fargate tasks, ALB and NAT have baseline costs even when idle. A demo can be shut down after review. Prefer a smaller single-task service for the exercise; production availability needs multiple tasks across availability zones and a measured scaling policy. AI usage is an additional workspace-credit cost.

Deployment is a written plan only, as requested. No AWS resources have been created and no Docker-host launch is claimed.
