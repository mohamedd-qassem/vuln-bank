# vuln-bank
⚠ This application is intentionally vulnerable and for educational purposes only.
# 🏛️ DEPI BANK - Vulnerable Online Banking App

> **⚠️ SECURITY DISCLAIMER ⚠️** > This application contains intentionally vulnerable code and severe security flaws (such as broken authentication). It is built **strictly for educational purposes, security training, and local penetration testing**.  
> **DO NOT** deploy this application to a production environment, a public server, or expose it to the internet. The creators are not responsible for any misuse or damage caused by this software.

---

## 📖 About The Project

DEPI BANK is a lightweight, single-page online banking simulator. Inspired by platforms like vulnbank.org and other educational security apps, it provides a realistic-looking banking interface with a deliberately flawed backend. 

It is designed to help students, developers, and security enthusiasts understand common web application vulnerabilities (like Broken Authentication) without the overhead of setting up complex databases or heavy frameworks.

## ✨ Features

* **Realistic UI:** A clean, modern, responsive front-end built with plain HTML/CSS (no external libraries required).
* **Mock Dashboard:** Features a working balance calculator and a dynamic transaction history table.
* **Simulated Transfers:** Users can simulate sending money, which dynamically updates their balance and transaction history.
* **Lightweight Backend:** Powered by Python and Flask using an in-memory dictionary database for instant setup and testing.

## 🐛 Intentional Vulnerabilities

This version of DEPI BANK currently features the following intentional vulnerabilities:

1. **Broken Authentication (CWE-287):** The backend completely ignores password validation. An attacker can log into any existing account (e.g., `admin`) by simply providing the username and leaving the password blank or typing random characters.
2. **Insecure Auto-Provisioning:** If a submitted username does not exist in the database, the backend automatically creates a new account for the user and grants them a default balance of $500.00.

## 💻 Tech Stack

* **Front-end:** HTML5, CSS3, Vanilla JavaScript (Fetch API)
* **Back-end:** Python 3, Flask

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
* [Python 3.x](https://www.python.org/downloads/)
* `pip` (Python package manager)
