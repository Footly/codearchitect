# Traceability SWE3 View

This document presents the relationships between libraries, packages, and unit tests. Each library implements a package and is verified by unit test/s

## Table of Contents

- [Summary Table](#summary-table)
- [Libraries](#libraries)
## Summary Table

| Satisfies | Library | Verified by |
|-----------|---------|-------------|
| [wificontrol](#wificontrol): <i style='font-size: smaller;'>Controls all the stuff related to the wifi connectivity</i> | [`wifi_ao`](#wifi_ao): Implements the wifi connectivity state machine | [unit-2](#unit-2): <i style='font-size: smaller;'>test cheks the initialization function of the wifi</i> |
| [monitorcontroller](#monitorcontroller): <i style='font-size: smaller;'>Monitors all the data read by the system and send the accoridng events when cert...</i> | [`monitoring_ao`](#monitoring_ao): Implements the state machine of the monitoring control | <span style="color: red;">[NOT FOUND] No items</span> |
## Libraries

[Back to Table of Contents](#table-of-contents)

### `wifi_ao`
**Description:** Implements the wifi connectivity state machine

- **Satisfies Packages:**
  - **[wificontrol](#wificontrol)**: Controls all the stuff related to the wifi connectivity
- **Verified by:**
  - **[unit-2](#unit-2)**: test cheks the initialization function of the wifi

### `monitoring_ao`
**Description:** Implements the state machine of the monitoring control

- **Satisfies Packages:**
  - **[monitorcontroller](#monitorcontroller)**: Monitors all the data read by the system and send the accoridng events when certainsituations are met.
- **Verified by:**
  - <span style='color: red;'>[NOT FOUND] No Unit tests verify this library.</span>

---

