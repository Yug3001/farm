// Password Requirements Component
// Use this in your SignUp page to show password requirements to users

import React, { useState } from 'react';

const PasswordRequirements = ({ password }) => {
    const requirements = [
        { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
        { label: 'One uppercase letter (A-Z)', test: (pwd) => /[A-Z]/.test(pwd) },
        { label: 'One lowercase letter (a-z)', test: (pwd) => /[a-z]/.test(pwd) },
        { label: 'One number (0-9)', test: (pwd) => /[0-9]/.test(pwd) },
        { label: 'One special character (!@#$%^&*)', test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) }
    ];

    return (
        <div style={styles.container}>
            <p style={styles.title}>Password must contain:</p>
            <ul style={styles.list}>
                {requirements.map((req, index) => {
                    const isMet = password ? req.test(password) : false;
                    return (
                        <li key={index} style={{
                            ...styles.item,
                            color: isMet ? '#2e7d32' : '#666'
                        }}>
                            <span style={styles.icon}>{isMet ? '✓' : '○'}</span>
                            {req.label}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

const styles = {
    container: {
        marginTop: '10px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        fontSize: '0.85rem'
    },
    title: {
        fontWeight: 'bold',
        marginBottom: '8px',
        color: '#333'
    },
    list: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    item: {
        padding: '4px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'color 0.2s'
    },
    icon: {
        fontWeight: 'bold',
        fontSize: '1.1rem'
    }
};

export default PasswordRequirements;

// USAGE EXAMPLE in SignUp.jsx:
/*
import PasswordRequirements from '../components/PasswordRequirements';

function SignUp() {
  const [password, setPassword] = useState('');

  return (
    <div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <PasswordRequirements password={password} />
    </div>
  );
}
*/
