# Jueteng Platform Flowcharts

This document outlines the core logic and organizational structure of the Jueteng platform.

## 1. User Role Hierarchy & Reporting
The platform follows a strict reporting structure to ensure accountability in collections and commissions.

```mermaid
graph TD
    Admin[Admin / System Owner] --- Bankero
    Bankero[Bankero / Investor] -- "Manages" --> Cabo[Cabo / Area Supervisor]
    Cabo -- "Manages" --> Kubrador[Kubrador / Collector]
    Kubrador -- "Manages" --> Player[Player / Manlalaro]
    
    style Admin fill:#f9f,stroke:#333,stroke-width:2px
    style Bankero fill:#ff9,stroke:#333
    style Cabo fill:#9f9,stroke:#333
    style Kubrador fill:#9ff,stroke:#333
    style Player fill:#fff,stroke:#333
```

---

## 2. Role Responsibilities (Swimlane View)
How different users interact during the daily draw cycle.

```mermaid
sequenceDiagram
    autonumber
    participant A as Admin
    participant B as Bankero
    participant C as Cabo
    participant K as Kubrador
    participant P as Player

    Note over A,P: PRE-DRAW PHASE
    A->>A: Create Daily Draw
    A->>P: Open Betting Status
    P->>K: Give Cash & Numbers
    K->>K: Place Bet (Deduct from Credit/Wallet)
    K->>C: Submit Collection Report
    C->>B: Remit Team Collections

    Note over A,P: BOLAHAN (DRAW) PHASE
    A->>A: Lock Bets (No more entries)
    A->>A: Execute Draw (Roll Numbers)
    
    Note over A,P: PAYOUT PHASE
    A->>K: Auto-Credit Winning Payouts
    K->>P: Disburse Cash to Winners
    A->>K: Credit 15% Commission
    A->>C: Credit 7% Team Commission
```

---

## 2. Betting Life Cycle
Process for managing a daily draw from creation to actual payout.

```mermaid
stateDiagram-v2
    [*] --> Upcoming: Admin Creates Draw
    Upcoming --> Open: Admin Opens Betting
    Open --> Open: Kubradors Place Bets
    Open --> Locked: LOCK_BETS (Market Closes)
    Locked --> Drawn: Bolahan (Admin Executes Draw)
    Drawn --> Settled: Payouts & Commissions Processed
    Settled --> [*]

    state Open {
        [*] --> PendingBets
        PendingBets --> CollectionRunning
    }
```

---

## 3. Deposit & Approval Flow
How players add funds to their wallet for betting.

```mermaid
graph LR
    P[Player] -- Submit Deposit Request --> PR[Pending Transaction]
    PR -- Review --> Admin{Admin}
    Admin -- "Approve ✔️" --> AS[Update User Balance]
    Admin -- "Reject ❌" --> RJ[Mark Rejected]
    AS --> Final[Transaction Completed]
    RJ --> Final
```

---

## 4. Betting & Commission Flow
Logic for placing a bet and calculating earnings.

```mermaid
sequenceDiagram
    participant P as Player
    participant K as Kubrador
    participant C as Cabo
    participant S as Server
    
    P->>K: Gives bet (Numbers + Amount)
    K->>S: POST /api/bets
    S->>S: Calculate Commissions
    Note over S: Kubrador Commission (10%)<br/>Cabo Commission (5%)
    S->>S: Deduct from Draw Pool
    S-->>K: 201 Created (Papelito Generated)
    K-->>P: Success Confirmation
```

---

## 5. Draw Execution (Bolahan)
Technical process when a winner is drawn.

```mermaid
flowchart TD
    Start([Admin Clicks Execute]) --> Lock(Lock Draw Status)
    Lock --> Hash(Verify Provably Fair Hash)
    Hash --> Numbers{Generate Winning Numbers}
    Numbers --> Save[Save Results to DB]
    Save --> Identify[Identify Winning Bets]
    
    subgraph Payout_Logic
        Identify --> Won(Update Status to WON)
        Won --> Credit(Credit Kubrador Balance)
        Credit --> Trans(Create Payout Transaction)
    end
    
    subgraph Cleanup
        Identify --> Lost(Mark others as LOST)
        Lost --> Settle(Finalize Draw Settlement)
    end
    
    Settle --> Broadcast([Broadcast Results via Socket.io])
```
