# Part 1 — System Design
This is a system design for an Ad Insight system that has the two parts: Ad Integration Core Backend & the API Querying service

## Ad Integration Core Backend
This is the integration system that handles the integration of the 3rd party social media ad systems. All services here work as background jobs.

### Job Scheduler Service
This handles the scheduling of the 3rd party API calls for the Ads and the activities
•⁠  ⁠Starts the ingestion process.
•⁠  ⁠Schedules *periodic API polling* at *different frequencies per platform*.
•⁠  ⁠Handles *failed jobs* with *exponential backoff*.

### Queue
•⁠  ⁠The scheduler *pushes tasks* into the queue.
•⁠  ⁠The queue *picks jobs* and they are *processed* (as labeled on the diagram).

### Redis Store
•⁠  ⁠Connected to the queue / failure path.
•⁠  ⁠Stores *failed processes* with relevant details for *debugging* and *retries*.

### Ad Integration Service

Ingestion runs as *three parallel paths* (one per platform):

| Path        | Role |
| ----------- | ---- |
| *Facebook* | End-to-end ingestion for that provider |
| *TikTok*   | Same |
| *Google*   | Same |

Each path is the same three steps:

1.⁠ ⁠*Platform-specific Polling*  
   - Calls the *Mock API Service*.  
   - Handles *different response formats, **pagination, **rate limiting, **retry logic, and **error handling* (as noted on the diagram).

2.⁠ ⁠*Data Transformation*  
   - Normalizes raw platform data into a *unified format* (see schema below).

3.⁠ ⁠*DB Insertion*  
   - Writes transformed rows into the primary database (*DB WRITE*).

### Data processing after write

•⁠  ⁠After data lands on *DB WRITE, an **On creation trigger* runs *Data Processing*.
•⁠  ⁠That step calculates *CTR, **ROAS, and **CPC, then **updates the database*.


## Core API Querying System
This is the system that the frontend uses to access the backend system

### Client (Marketing Team / Frontend System)
•⁠  ⁠The consumer of the query APIs (marketing tools or frontend).

### API Gateway
•⁠  ⁠Entry point for clients.
•⁠  ⁠*Security* and *rate limiters* to protect the system.

### API Service
•⁠  ⁠Business logic to *fetch and aggregate marketing insights*.

### Cache Layer
•⁠  ⁠Sits between the *API Service* and the data source.
•⁠  ⁠Speeds up frequent queries.

### DB READ (Replica)
•⁠  ⁠The *API Service* reads from a *read replica* to offload the primary.
•⁠  ⁠*DB REPLICA SYSTEM: replication from **DB WRITE* → *DB READ* (as shown on the diagram).


## Data schema (as on the diagram)

### Table: Providers
•⁠  ⁠*provider name*
•⁠  ⁠*provider get insight url*
•⁠  ⁠*provider status*
•⁠  ⁠*date_created*
•⁠  ⁠*date_updated*


### Table:Insight
•⁠  ⁠*id*
•⁠  ⁠*ad_id*
•⁠  ⁠*campaign_id*
•⁠  ⁠*platform*
•⁠  ⁠*description*
•⁠  ⁠*campaign_date*
•⁠  ⁠*click*
•⁠  ⁠*impressions*
•⁠  ⁠*spends*
•⁠  ⁠*revenue*
•⁠  ⁠*provider*
•⁠  ⁠*ctr*
•⁠  ⁠*cpc*
•⁠  ⁠*roas*

On the insertion of data after the data transformation, the key data are saved to the DB while on update, the data processing updates the cpc, ctr, roas
using the id


## How this maps to the exercise requirements

| Requirement | Where it lives in the diagram |
| ----------- | ----------------------------- |
| Data polling + pagination + formats | *Platform-specific Polling* → *Mock API Service* |
| Job scheduling + backoff | *Job Scheduler Service, **Queue, **Redis Store* |
| Metrics CTR / CPC / ROAS | *On creation trigger* + *Data Processing* |
| Query API at scale | *API Gateway, **API Service, **Cache Layer, **DB READ (Replica)* |
| Dedup / idempotent ingest | Implied by unified rows + DB constraints (not drawn as a separate box) |

API surface from the brief (not every box is named on the diagram, but it is part of Part 1 scope):

•⁠  ⁠⁠ GET /api/performance ⁠ — aggregated performance, filters by platform, date range, campaign.
•⁠  ⁠⁠ GET /api/top-performing ⁠ — top ads by metric.



## Diagram artifact

Attach the diagram image next to this README, for example:

•⁠  ⁠⁠ part_1/system_design.png ⁠  
  (or ⁠ .jpg ⁠ / ⁠ .pdf ⁠ per submission instructions)

The file should depict the same components and labels as above.



## Our Assumptions
•⁠  ⁠Credentials for the *Mock API Service* and production providers are stored as secrets, not in code.
•⁠  ⁠*Redis Store* can be implemented as Redis, a queue dead-letter topic, or another store; the diagram’s intent is *failed job visibility + retry*.