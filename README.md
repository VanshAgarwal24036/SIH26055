# Spectra Shakti

## Smart Scan Strategy for Electronic Warfare

**Smart India Hackathon 2026 | Problem Statement: SIH26055**  
**Theme:** Robotics and Drones  
**Category:** Software  
**Team ID:** 148686  
**Team:** Codecatalysts

---

## Overview

**Spectra Shakti** is a simulation-driven intelligent spectrum scanning platform developed for **Smart India Hackathon 2026 Problem Statement SIH26055 – Smart Scan Strategy for Electronic Warfare**.

The core challenge is that a receiver cannot monitor the complete frequency spectrum simultaneously. When emitters are unknown, changing, periodic, intermittent, or frequency-agile, a conventional fixed scanning strategy can miss signals or detect them only after a delay.

Spectra Shakti is designed to address this challenge by moving from fixed scanning towards **adaptive scan scheduling**. The system observes receiver outcomes such as **HIT, MISS, and false alarms**, studies frequency and time patterns, maintains knowledge about previously observed bands, and uses that information to make better future scan decisions.

The current prototype establishes the complete **RF simulation, virtual receiver, scheduler, knowledge, metrics, backend API, and frontend visualization layers**. The next stage is to integrate **Machine Learning, contextual bandits, periodicity-aware intelligence, and Deep Reinforcement Learning (DQN)** for learned scan decisions.

---

## Problem We Are Solving

A wide RF spectrum contains multiple frequency bands, but a practical receiver has limited instantaneous bandwidth and therefore has to scan the spectrum sequentially or according to a schedule.

A fixed schedule can become inefficient when:

- an emitter appears only for a short period,
- an emitter follows a periodic pattern,
- an emitter becomes intermittent,
- an emitter changes its frequency,
- the environment changes over time, or
- previously unknown activity appears in a band that has not been prioritized.

This creates three important challenges:

1. **Missed detections** – an active emitter may not be scanned when it is transmitting.
2. **Delayed detection** – the correct band may be reached only after unnecessary scans.
3. **Inefficient scanning** – valuable receiver time can be spent repeatedly scanning low-value bands.

The objective of Spectra Shakti is to build a scan strategy that can learn from observations and make the receiver more adaptive.

---

## Proposed Solution

Spectra Shakti combines an RF environment simulator, a virtual receiver, multiple scan schedulers, a knowledge system, performance evaluation, and an ML/RL-ready architecture.

The system continuously follows this loop:

```text
RF Environment
      ↓
Virtual Receiver
      ↓
HIT / MISS / False Alarm
      ↓
Knowledge Update + Metrics
      ↓
Scheduler Decision
      ↓
Select Next Frequency Band
      ↓
Receiver Scans the Selected Band
      ↓
Repeat
```

The future learning-based system extends this loop as follows:

```text
RF Environment
      ↓
Receiver Observation
      ↓
State Representation
      ↓
DQN / RL Agent
      ↓
Next-Band Action
      ↓
Receiver Scan
      ↓
Reward
      ↓
Next State
      ↓
Learning
```

---

# Current Prototype

The current Spectra Shakti prototype provides a complete interactive interface for controlling the simulation, observing RF activity, understanding scan decisions, and evaluating scheduler performance.

## 1. Authentication / Operator Entry

The system starts with an operator login interface. After authentication, the user enters the protected Spectra Shakti monitoring dashboard.

The purpose of this layer is to provide a dedicated operator-facing interface for monitoring the simulated RF environment and scanning process.

---

## 2. Main Dashboard

The **Dashboard** is the central monitoring screen of Spectra Shakti.

It provides a real-time overview of the current simulation and includes:

- Live RF spectrum visualization
- Current receiver band
- Current scan result
- Probability of Detection (Pd)
- Probability of False Alarm (Pfa)
- Event Detection Rate
- Intercepted Events
- Simulation progress
- Scheduler selection
- Simulation speed control
- Start / Pause / Step / Reset controls
- Scenario randomization
- Recent spectrum and scanning information

### Available scan strategies

The current prototype supports:

- **Sequential Scheduler** – scans bands in a fixed sequence.
- **Random Scheduler** – selects bands randomly.
- **Round Robin Scheduler** – cyclically scans the available bands.
- **Greedy Scheduler** – prioritizes bands using observed hit probability.
- **Knowledge-Aware Scheduler** – uses accumulated band knowledge such as activity, uncertainty, freshness, periodicity, and transitions.

The Dashboard is designed to answer three questions at a glance:

> **What is happening in the spectrum?**  
> **What is the receiver scanning?**  
> **How is the current strategy performing?**

---

## 3. Live Scan

The **Live Scan** page provides a detailed operational view of the receiver's current scan.

It displays:

- Current frequency band
- Receiver state
- Latest scan result
- HIT / MISS status
- Scan timeline
- Recent scan history
- Scan statistics
- Scheduler decision

The purpose of this page is to show the actual sequence of receiver decisions rather than only the aggregate metrics.

---

## 4. RF Environment

The **RF Environment** page represents the simulated electromagnetic environment in which the virtual receiver is operating.

The page provides:

- Current scenario information
- Number of emitters
- Number of RF bands
- Live spectrum occupancy
- Band-by-band occupancy view
- Current active emitter information
- Current receiver band
- Emitter behavior classification

### Simulated emitter types

Spectra Shakti currently models multiple emitter behaviors:

- **Continuous** – continuously transmitting activity.
- **Periodic** – transmitting according to a repeating temporal pattern.
- **Intermittent** – activity that appears and disappears over time.
- **Frequency Agile** – activity that can move between frequency bands.

These behaviors make the simulation dynamic and provide different conditions for evaluating scheduling strategies.

---

## 5. Knowledge Map

The **Knowledge Map** represents the information accumulated from previous receiver observations.

Instead of treating every scan independently, Spectra Shakti maintains per-band knowledge including:

- Scan count
- Hit count
- Miss count
- False alarm count
- Estimated activity
- Uncertainty
- Last scan information
- Last hit information
- Scan freshness
- Hit history
- Periodicity information
- Band transition information

As the simulation progresses, the Knowledge Map changes according to the observations collected by the receiver.

This layer is particularly important for adaptive scheduling because it provides the information that a future ML/RL policy can use as part of its state representation.

---

## 6. Performance

The **Performance** page provides quantitative evaluation of the current scanning strategy.

The prototype tracks:

- Total scans
- Hits
- Misses
- False alarms
- Probability of Detection (Pd)
- Probability of False Alarm (Pfa)
- Event Detection Rate
- Intercepted Events
- Missed Events
- Total Events
- Average Interception Time
- Simulation progress

These metrics allow different schedulers to be evaluated under controlled simulation scenarios.

The goal is not simply to increase the number of scans. The system is intended to study the trade-off between detection, event interception, false alarms, scan efficiency, and interception delay.

---

# System Architecture

```text
                         ┌───────────────────────┐
                         │         Operator      │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │    React Frontend     │
                         │                       │
                         │  • Dashboard          │
                         │  • Live Scan          │
                         │  • RF Environment     │
                         │  • Knowledge Map      │
                         │  • Performance        │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │       FastAPI         │
                         │      Backend API      │
                         └───────────┬───────────┘
                                     │
             ┌───────────────────────┼───────────────────────┐
             │                       │                       │
             ▼                       ▼                       ▼
   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │  RF Environment  │    │    Scheduler     │    │ Virtual Receiver │
   │                  │    │                  │    │                  │
   │ • Emitters       │    │ • Sequential     │    │ • HIT / MISS     │
   │ • Frequency Bands│    │ • Random         │    │ • Detection      │
   │ • Time Slots     │    │ • Round Robin    │    │ • False Alarm    │
   │ • Signal Activity│    │ • Greedy         │    │ • Dwell Time     │
   │                  │    │ • Knowledge-Aware│    │ • Retuning       │
   └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    ▼
                         ┌───────────────────────┐
                         │ Knowledge + Metrics   │
                         │                       │
                         │ • Scan History        │
                         │ • Activity Estimates  │
                         │ • Periodicity         │
                         │ • Band Transitions   │
                         │ • Pd / Pfa            │
                         │ • Event Detection     │
                         └───────────────────────┘
```

The proposed architecture is designed around a React frontend, a FastAPI integration layer, an RF environment and receiver simulation, scheduling intelligence, and an ML/RL layer for adaptive decision-making. The project proposal also identifies activity prediction, contextual bandits, periodicity detection, and DQN/RL as the intended intelligence components.

---

# Project Workflow

A single simulation step follows this process:

```text
1. Scheduler selects a frequency band
              ↓
2. Virtual receiver scans the selected band
              ↓
3. RF environment determines hidden signal activity
              ↓
4. Receiver produces observation
              ↓
5. HIT / MISS / False Alarm is recorded
              ↓
6. Knowledge Map is updated
              ↓
7. Performance metrics are updated
              ↓
8. Scheduler receives updated information
              ↓
9. Next scan decision is made
```

This design keeps the scheduler separate from the hidden RF truth. The scheduler receives observations rather than directly accessing the ground-truth environment, allowing the system to model the information limitation that motivates the problem.

---

# RF Simulation Environment

Spectra Shakti uses a controlled software-based RF environment for experimentation.

The environment supports:

- Multiple frequency bands
- Multiple emitters
- Time-dependent signal activity
- Continuous transmitters
- Periodic transmitters
- Intermittent transmitters
- Frequency-agile transmitters
- Randomized scenarios
- Reproducible simulation seeds

The simulator provides a safe and repeatable environment for testing scanning policies before introducing learned decision-making.

---

# Virtual Receiver

The virtual receiver models the observation process of the scanning system.

For each selected band, it records information including:

- Time slot
- Frequency band
- Detection result
- HIT / MISS result
- False alarm state
- Scan duration

Receiver behaviour includes configurable detection probability, false-alarm probability, dwell time, retuning time, sensitivity, and reproducible random behaviour.

The receiver does not expose the hidden RF truth to the scheduler. This keeps the decision-making process observation-driven.

---

# Scheduling Layer

The scheduler layer provides a common interface for selecting the next frequency band.

### Sequential

Scans bands in a fixed cyclic order.

### Random

Chooses the next band randomly, providing a simple exploration baseline.

### Round Robin

Cycles through available bands in a deterministic rotation.

### Greedy

Uses observed hit information to prioritize bands that appear more active.

### Knowledge-Aware

Combines accumulated knowledge about activity, uncertainty, scan freshness, temporal patterns, periodicity, and band transitions to generate a more informed scan decision.

These schedulers provide progressively more informed baselines against which the future learned policy can be evaluated.

---

# Knowledge Representation

The knowledge layer stores information for individual frequency bands and updates it after every observation.

Important features include:

```text
Band Activity
Scan Frequency
Hit / Miss History
Uncertainty
Scan Freshness
Hit Intervals
Estimated Periodicity
Periodicity Confidence
Band Transitions
Likely Next Band
```

This representation is intended to bridge the current rule-based scheduling layer and the future machine-learning agent.

---

# Performance Evaluation

The system evaluates scan strategies using both receiver-level and event-level metrics.

### Receiver-level metrics

- Probability of Detection (Pd)
- Probability of False Alarm (Pfa)
- Total scans
- Hits
- Misses
- False alarms

### Event-level metrics

- Total events
- Intercepted events
- Missed events
- Event Detection Rate
- Average Interception Time

This allows the project to evaluate not only whether the receiver detected activity, but also whether meaningful signal events were detected in a timely manner.

---

# Technology Stack

## Frontend

- **React.js** – user interface
- **Vite** – frontend development/build tooling
- **React Router** – page navigation
- **Axios** – API communication
- **Recharts** – charts and visualizations
- **Lucide React** – interface icons
- **CSS** – custom UI styling

## Backend

- **Python**
- **FastAPI** – backend API and integration layer
- **Uvicorn** – ASGI server

## Simulation and Data Processing

- **NumPy**
- **Pandas**
- **SciPy**
- **Scikit-learn**
- Custom RF simulation modules
- Custom receiver model
- Custom scheduler framework

## Planned Intelligence Layer

- Activity prediction
- Contextual Bandits
- Periodicity detection
- Deep Q-Networks (DQN)
- Reinforcement Learning using PyTorch

---

# Project Structure

```text
SIH26055/
│
├── backend/
│   ├── __init__.py
│   ├── main.py
│   └── simulation_controller.py
│
├── environment/
│   ├── __init__.py
│   ├── emitter.py
│   ├── rf_environment.py
│   └── scenarios.py
│
├── receiver/
│   ├── __init__.py
│   └── receiver.py
│
├── schedulers/
│   ├── __init__.py
│   ├── base.py
│   ├── sequential.py
│   ├── random_scan.py
│   ├── round_robin.py
│   ├── greedy.py
│   ├── knowledge_map.py
│   └── knowledge_aware.py
│
├── metrics/
│   ├── __init__.py
│   └── evaluation.py
│
├── experiments/
│   ├── __init__.py
│   ├── runner.py
│   └── benchmark.py
│
├── ml/
│   └── dataset_builder.py
│
├── data/
├── results/
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── layouts/
    │   ├── pages/
    │   ├── services/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css
    │   ├── styles.css
    │   ├── dashboard.css
    │   ├── live-scan.css
    │   ├── rf-environment.css
    │   ├── knowledge-map.css
    │   └── performance.css
    │
    └── package.json
```

---

# Backend API

The current backend exposes the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/simulation/state` | Get current simulation state |
| POST | `/api/simulation/start` | Start / initialize simulation |
| POST | `/api/simulation/pause` | Pause simulation |
| POST | `/api/simulation/step` | Execute one simulation step |
| POST | `/api/simulation/reset` | Reset simulation |
| POST | `/api/simulation/scheduler` | Change scheduler |
| POST | `/api/simulation/scenario` | Generate a randomized scenario |

FastAPI automatically provides interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

---

# Installation and Setup

## Prerequisites

Make sure the following are installed:

- Python 3.x
- Node.js and npm
- Git

---

## 1. Clone the repository

```bash
git clone https://github.com/<YOUR_USERNAME>/SIH26055.git
cd SIH26055
```

---

## 2. Install backend dependencies

```bash
pip install fastapi uvicorn numpy pandas scipy scikit-learn
```

Start the backend:

```bash
uvicorn backend.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 3. Install frontend dependencies

```bash
cd frontend
npm install
```

Run the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Using the Prototype

1. Start the FastAPI backend.
2. Start the React frontend.
3. Open the frontend in the browser.
4. Log in through the operator interface.
5. Open the Dashboard.
6. Select a scheduler.
7. Start the simulation.
8. Observe live spectrum activity and scan results.
9. Open Live Scan to inspect the receiver's scan sequence.
10. Open RF Environment to inspect simulated emitter activity.
11. Open Knowledge Map to observe accumulated band knowledge.
12. Open Performance to evaluate the current strategy.
13. Randomize the scenario and repeat the experiment to compare behaviour under different conditions.

---

# Data and Research Direction

The project proposal identifies the **Turing Synthetic Radar Dataset** as part of the data-processing direction, together with NumPy, Pandas, and SciPy for feature extraction, time-series analysis, and frequency analysis.

The dataset/research direction is intended to support realism and feature development. The scheduler itself is evaluated in a controlled simulation environment so that decisions, observations, and outcomes can be generated and measured consistently.

---

# Machine Learning and Reinforcement Learning Roadmap

The current prototype establishes the environment and evaluation pipeline required before training a learning-based scheduler.

The planned DQN workflow is:

```text
Current RF State
      ↓
Feature Extraction
      ↓
State Vector
      ↓
DQN Agent
      ↓
Select Band
      ↓
Receiver Scan
      ↓
Observation
      ↓
Reward
      ↓
Next State
      ↓
Experience Replay
      ↓
Network Update
      ↓
Improved Policy
```

### Planned state representation

The DQN state will be based on observable and derived information such as:

- Band activity
- Scan count
- Hit / MISS history
- Uncertainty
- Freshness
- Periodicity
- Transition probabilities
- Current time
- Previous scanned band

### Planned action space

Each action corresponds to selecting one available RF frequency band for the next receiver scan.

### Planned reward design

The reward function will encourage useful detections and efficient scan decisions while accounting for misses, false alarms, unnecessary scans, and detection/interception delay.

The exact reward formulation will be tuned experimentally during the training phase.

---

# Future Scope

The next stages of Spectra Shakti will focus on:

- DQN-based adaptive scan scheduling
- Contextual-bandit exploration and exploitation
- Improved emitter activity prediction
- Periodicity-aware decision making
- Frequency-agility-aware scheduling
- Larger simulation environments
- More comprehensive benchmark experiments
- ML training and validation
- Comparison between learned and baseline schedulers
- Improved operator analytics and visualization

The long-term objective is to develop a scanner that can continuously learn from receiver observations and adapt its schedule to changing emitter behaviour without relying entirely on prior emitter intelligence.

---

# Expected Impact

Spectra Shakti is designed to explore improvements in:

- Faster signal detection
- Higher event interception opportunities
- Adaptive spectrum surveillance
- Efficient spectrum monitoring
- Reduced interception delay
- Better handling of changing emitter behaviour
- Reduced unnecessary scanning
- Reduced operator workload

These objectives are aligned with the intended impact described in the SIH proposal. 

---

# Safety and Simulation Scope

The current prototype is a **software-based simulation and research platform**.

It does not require live RF interception hardware for the prototype. The controlled simulation environment provides a reproducible way to study scanning policies, receiver observations, and learning algorithms before any future hardware-oriented experimentation.

---

# Research References

The project direction is informed by research in:

- Adaptive frequency scanning
- Electronic Support systems
- Receiver scheduling
- Contextual Bandits
- Machine Learning
- Deep Reinforcement Learning
- DQN-based scheduling
- Emitter activity modelling
- Periodicity detection

The SIH proposal references research on reinforcement-learning-based receiver scheduling and identifies Random Forest, Contextual Bandits, DQN/PyTorch, React, and FastAPI as relevant technologies and references for the proposed system.

---

# Team Codecatalysts

**Smart India Hackathon 2026**  
**Problem Statement:** SIH26055  
**Problem Title:** Smart Scan Strategy for Electronic Warfare  
**Theme:** Robotics and Drones  
**Category:** Software  
**Team ID:** 148686  
**Team Name:** Codecatalysts

---

# Project Status

### Current

- ✅ Interactive frontend
- ✅ Operator login interface
- ✅ Live Dashboard
- ✅ RF spectrum visualization
- ✅ Live Scan page
- ✅ RF Environment page
- ✅ Knowledge Map
- ✅ Performance analytics
- ✅ FastAPI backend
- ✅ RF environment simulator
- ✅ Virtual receiver
- ✅ Baseline schedulers
- ✅ Knowledge-aware scheduler
- ✅ Simulation controls
- ✅ Scheduler benchmarking framework

### Next

- 🔄 ML-based activity prediction
- 🔄 Contextual bandit scheduling
- 🔄 DQN environment
- 🔄 DQN agent
- 🔄 Experience replay
- 🔄 RL training and evaluation
- 🔄 Learned scheduler vs baseline comparison

---

# ⭐ Spectra Shakti

> **From fixed spectrum scanning to intelligent, adaptive scan scheduling.**

**Built by Team Codecatalysts for Smart India Hackathon 2026.**
