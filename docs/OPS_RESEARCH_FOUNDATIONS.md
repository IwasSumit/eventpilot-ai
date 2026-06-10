# Mathematical Foundations of EventPilot AI

## Design Principle

EventPilot AI separates **operational state estimation** from **AI reasoning**.

Operational metrics are computed using deterministic models implemented directly in the application. These metrics are then supplied to Gemini through Google Cloud Agent Builder, which is responsible for contextual interpretation, recommendation generation, and natural-language explanations.

This separation ensures that operational metrics remain transparent, reproducible, and auditable while allowing the language model to focus on decision support.

---

# 1. Zone Risk Assessment

## Objective

Estimate the operational risk associated with a venue zone using measurable indicators of crowding and event activity.

## Implemented Model

The risk score is computed as a weighted linear combination:

```math
R = 0.45D + 0.25I + 0.20Q + 0.10U
```

where:

| Variable | Description |
|-----------|-----------|
| D | Crowd Density |
| I | Incident Count |
| Q | Queue Pressure |
| U | Schedule Urgency |

## Rationale

This model follows the **Weighted Sum Model (WSM)**, one of the most widely used aggregation methods in Multi-Criteria Decision Analysis (MCDA).

The objective is not to estimate absolute safety risk but to provide a single operational priority score suitable for ranking and alert generation.

The weighting reflects the assumption that:

- Crowd density is the strongest indicator of potential congestion.
- Incidents represent realized operational disruption.
- Queue pressure captures localized bottlenecks.
- Schedule urgency captures expected near-term demand surges.

The resulting score is therefore an operational decision-support metric rather than a probabilistic risk estimate.

## Mathematical Basis

The Weighted Sum Model is defined as:

```math
S = \sum_{i=1}^{n} w_i x_i
```

subject to:

```math
\sum_{i=1}^{n} w_i = 1
```

where:

- \(x_i\) represents a criterion value
- \(w_i\) represents its relative importance

EventPilot implements a four-criterion instance of this model.

## Limitations

The weights are currently domain-informed heuristics and are not learned from historical event data.

### Future Enhancements

- Analytic Hierarchy Process (AHP)
- Expert elicitation frameworks
- Empirical calibration using historical event outcomes
- Bayesian risk estimation

---

# 2. Queue Wait Estimation

## Objective

Provide a real-time estimate of attendee waiting time.

## Implemented Model

```math
W = \frac{L}{\mu c}
```

where:

| Variable | Description |
|-----------|-----------|
| W | Estimated waiting time |
| L | Queue length |
| μ | Service rate per counter |
| c | Number of active counters |

Additional adjustments are applied to account for contextual factors such as popularity and walking delay.

## Rationale

The model approximates a queue as a service system in which customers are processed at a finite rate.

The estimate is derived from:

```math
Time = \frac{Workload}{Processing\ Capacity}
```

where:

- Workload corresponds to queue length.
- Processing capacity corresponds to aggregate service throughput.

## Mathematical Basis

The formulation is consistent with the intuition underlying Little's Law:

```math
L = \lambda W
```

where:

| Symbol | Meaning |
|-----------|-----------|
| L | Average number in system |
| λ | Throughput rate |
| W | Average time in system |

Rearranging:

```math
W = \frac{L}{\lambda}
```

In EventPilot:

```math
\lambda \approx \mu c
```

which yields the implemented approximation.

## Limitations

The model assumes approximately stable service rates and does not explicitly model:

- Time-varying arrivals
- Queue abandonment
- Service-time distributions

### Future Enhancements

#### M/M/1 Queue

```math
W = \frac{1}{\mu - \lambda}
```

#### M/M/c Queue

```math
\rho = \frac{\lambda}{c\mu}
```

Future implementations may incorporate queueing-theoretic waiting time estimation and discrete-event simulation.

---

# 3. Inventory Forecasting

## Objective

Estimate remaining time before inventory depletion.

## Implemented Model

Demand intensity is adjusted using operational indicators:

```math
M = 1 + \frac{Q}{100} + \frac{P}{200}
```

where:

| Variable | Description |
|-----------|-----------|
| Q | Queue Length |
| P | Popularity Score |

The adjusted demand rate becomes:

```math
r = r_0 M
```

where \(r_0\) is the baseline sales rate.

Stockout time is computed as:

```math
T = \frac{S}{r}
```

where:

| Variable | Description |
|-----------|-----------|
| T | Time to stockout |
| S | Current inventory |
| r | Adjusted demand rate |

## Rationale

This follows the standard inventory depletion relationship:

```math
Time\ Remaining = \frac{Inventory}{Consumption\ Rate}
```

Queue length and popularity act as observable proxies for near-term demand pressure.

## Limitations

The model assumes demand remains approximately constant over the forecast horizon.

### Future Enhancements

#### Exponential Smoothing

```math
F_{t+1} = \alpha X_t + (1-\alpha)F_t
```

Potential future additions include:

- Moving-average forecasting
- ARIMA models
- Probabilistic demand forecasting
- Machine-learning demand prediction

---

# 4. Activity Recommendation Scoring

## Objective

Rank candidate activities for an attendee.

## Implemented Model

```math
A =
0.35I +
0.15P +
0.20T +
0.15C +
0.10D +
0.05U
```

where:

| Variable | Description |
|-----------|-----------|
| I | Interest Alignment |
| P | Popularity |
| T | Time Fit |
| C | Crowd Suitability |
| D | Distance Suitability |
| U | Urgency |

## Rationale

The recommendation problem is formulated as a multi-attribute utility maximization task.

Activities are ranked according to:

```math
\arg\max A
```

The highest-scoring activity is considered the most suitable recommendation under current conditions.

## Mathematical Basis

The model corresponds to an additive utility function:

```math
U(x) = \sum_{i=1}^{n} w_i u_i(x)
```

commonly used in:

- Decision-support systems
- Recommender systems
- Resource allocation problems

## Limitations

The current model is static and does not learn from user behavior.

### Future Enhancements

- Collaborative filtering
- Context-aware recommendation systems
- Reinforcement learning
- Personalized preference learning

---

# Future Mathematical and Modeling Enhancements

The current implementation prioritizes explainability, responsiveness, and ease of deployment. Future versions could improve mathematical rigor through the following enhancements:

## Event Digital Twin

- Discrete-event simulation
- SimPy-based simulation environments
- Resource-flow modeling

## Crowd Flow Modeling

### Social Force Models

```math
m \frac{dv}{dt}
=
F_{desired}
+
F_{social}
+
F_{boundary}
```

### Cellular Automata Models

Applications:

- Stadium planning
- Transportation hubs
- Evacuation analysis

## Probabilistic Risk Assessment

```math
P(Incident \mid Density, Queue, Schedule)
```

Potential approaches:

- Bayesian Networks
- Dynamic Bayesian Models
- Hidden Markov Models

## Real-Time Sensor Integration

Replace simulated inputs with:

- IoT crowd counters
- Wi-Fi density estimation
- Computer vision systems
- Ticket scanning systems
- POS transaction systems

## Optimization-Based Decision Support

### Route Optimization

```math
\min \sum c_{ij}x_{ij}
```

subject to congestion constraints.

### Staff Allocation

Integer programming formulations for operational resource deployment.

### Inventory Replenishment

Operations research models for restocking optimization.

## Learning-Based Agent Policies

- Multi-agent systems
- Reinforcement learning
- Monte Carlo Tree Search
- Decision-theoretic planning

---

# References

1. Keeney, R. L., & Raiffa, H. *Decisions with Multiple Objectives: Preferences and Value Tradeoffs*. Wiley, 1993.

2. Triantaphyllou, E. *Multi-Criteria Decision Making Methods: A Comparative Study*. Springer, 2000.

3. Little, J. D. C. “A Proof for the Queueing Formula: L = λW.” *Operations Research*, 9(3), 1961, pp. 383–387.

4. Silver, E. A., Pyke, D. F., & Peterson, R. *Inventory Management and Production Planning and Scheduling*. Wiley, 1998.

5. Hillier, F. S., & Lieberman, G. J. *Introduction to Operations Research*. 11th Edition, McGraw-Hill, 2020.

---

## Closing Note

EventPilot AI currently prioritizes transparency, explainability, and operational responsiveness through deterministic analytics and agent-assisted reasoning. While the present implementation uses heuristic models suitable for real-time decision support and hackathon-scale deployment, the architecture is intentionally designed to support future integration of queueing theory, optimization, probabilistic inference, forecasting, and simulation-based digital twin methodologies.
