import { useEffect } from 'react'
import { Form, Input, Button, message } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logos.svg'
import instance from '../utils/axios'
import { usePermissions } from '../context/PermissionsContext'

// Custom Input wrapper compatible with Ant Design Form.Item
const CustomLoginInput = ({ icon, type = "text", ...props }) => {
  return (
    <div style={styles.inputWrapper}>
      <span style={styles.inputIcon}>{icon}</span>
      <div className="white-input-container-custom" style={styles.whiteInputContainer}>
        {type === "password" ? (
          <Input.Password
            {...props}
            variant="borderless"
            style={styles.innerWhiteInput}
          />
        ) : (
          <Input
            {...props}
            variant="borderless"
            style={styles.innerWhiteInput}
          />
        )}
      </div>
    </div>
  )
}

const Login = () => {
  const navigate = useNavigate()
  const { refresh } = usePermissions()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const onFinish = async (values) => {
    try {
      const res = await instance.post('/auth/login', values)
      const user = res.data.user
      localStorage.setItem('token', res.data.access_token)

      // Staff-linked users should carry staff context into the dashboard session.
      if (user.role === 'STAFF' || user.role === 'TEACHER' || user.role === 'PRINCIPAL' || user.role === 'TRANSPORT_MANAGER') {
        try {
          // Staff list works if user has staff:read permission
          const staffRes = await instance.get('/staff')
          const staffList = Array.isArray(staffRes.data) ? staffRes.data : staffRes.data?.data || []
          const myStaff = staffList.find(s => s.email === user.email)
          if (myStaff) {
            user.staffId = myStaff.id
            user.designation = myStaff.designation
          }
        } catch {
          // Fallback: check own leave applications (auto-filtered to current user)
          try {
            const leaveRes = await instance.get('/hr/leave/applications', { params: { limit: 1 } })
            const leaves = Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data?.data || []
            if (leaves[0]?.staffId) user.staffId = leaves[0].staffId
          } catch {}
          // Also try permissions
          if (!user.staffId) {
            try {
              const permRes = await instance.get('/hr/permission', { params: { limit: 1 } })
              const perms = Array.isArray(permRes.data) ? permRes.data : permRes.data?.data || []
              if (perms[0]?.staffId) user.staffId = perms[0].staffId
            } catch {}
          }
        }
      }

      localStorage.setItem('user', JSON.stringify(user))
      await refresh()
      message.success('Login successful!')
      navigate('/dashboard')
    } catch (err) {
      message.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div style={styles.wrapper}>
      {/* Target and override global Ant Design input styles locally inside the custom white input container */}
      <style>{`
        .white-input-container-custom > .ant-input {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          height: 100% !important;
          padding: 0 16px !important; 
        }
        .white-input-container-custom .ant-input-affix-wrapper {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          width: 100% !important;
          height: 100% !important;
          padding: 0 16px !important;
          display: flex !important;
          align-items: center !important;
        }
        .white-input-container-custom .ant-input-affix-wrapper .ant-input {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          height: 100% !important;
          padding: 0 !important; 
        }
        .white-input-container-custom .ant-input-affix-wrapper:focus,
        .white-input-container-custom .ant-input-affix-wrapper-focused {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        /* Custom styling inside white container for smooth cursor and placeholder alignment */
        .white-input-container-custom .ant-input::placeholder {
          color: #94a3b8 !important;
        }
      `}</style>

      {/* Left branding panel */}
      <div style={styles.leftPanel}>
        <div style={styles.brandContent}>
          <div style={styles.logoWrapper}>
            <img src={logo} alt="Enterprise Logo" style={styles.logo} />
          </div>
          <h1 style={styles.brandTitle}>Kodex HRM</h1>
          <p style={styles.brandSubtitle}>DEVELOPED BY KODEX INFOSOLUTIONS</p>
          <p style={styles.brandDesc}>
            A comprehensive digital platform for workforce lifecycle, multi-shift scheduling, automated biometric attendance, statutory compliance, and payroll administration.
          </p>
        </div>

        {/* Custom School Building Outline SVG */}
        <div style={styles.schoolSvgContainer}>
          <svg viewBox="-10 0 420 200" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
            {/* Ground line */}
            <line x1="10" y1="180" x2="390" y2="180" stroke="#4ba4e3" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
            
            {/* Left wing base */}
            <rect x="50" y="110" width="110" height="70" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            {/* Right wing base */}
            <rect x="240" y="110" width="110" height="70" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            {/* Center tower base */}
            <rect x="160" y="80" width="80" height="100" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            
            {/* Central Gable/Roof */}
            <polygon points="160,80 200,45 240,80" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            {/* Flag pole & flag */}
            <line x1="200" y1="45" x2="200" y2="20" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <path d="M200,20 Q208,23 215,20 L215,30 Q208,33 200,30 Z" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            
            {/* Clock circle */}
            <circle cx="200" cy="65" r="10" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="200" y1="65" x2="200" y2="60" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="200" y1="65" x2="205" y2="65" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />

            {/* Arched main door */}
            <path d="M188,180 L188,150 A12,12 0 0 1 212,150 L212,180 Z" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="200" y1="140" x2="200" y2="180" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />

            {/* Steps */}
            <rect x="180" y="180" width="40" height="4" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <rect x="176" y="184" width="48" height="4" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />

            {/* Left wing windows */}
            {/* Top row (3 windows) */}
            <rect x="65" y="120" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="74" y1="120" x2="74" y2="142" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="65" y1="131" x2="83" y2="131" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="96" y="120" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="105" y1="120" x2="105" y2="142" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="96" y1="131" x2="114" y2="131" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="127" y="120" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="136" y1="120" x2="136" y2="142" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="127" y1="131" x2="145" y2="131" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            {/* Bottom row (3 windows) */}
            <rect x="65" y="150" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="74" y1="150" x2="74" y2="172" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="65" y1="161" x2="83" y2="161" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="96" y="150" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="105" y1="150" x2="105" y2="172" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="96" y1="161" x2="114" y2="161" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="127" y="150" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="136" y1="150" x2="136" y2="172" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="127" y1="161" x2="145" y2="161" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            {/* Right wing windows */}
            {/* Top row (3 windows) */}
            <rect x="255" y="120" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="264" y1="120" x2="264" y2="142" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="255" y1="131" x2="273" y2="131" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="286" y="120" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="295" y1="120" x2="295" y2="142" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="286" y1="131" x2="304" y2="131" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="317" y="120" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="326" y1="120" x2="326" y2="142" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="317" y1="131" x2="335" y2="131" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            {/* Bottom row (3 windows) */}
            <rect x="255" y="150" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="264" y1="150" x2="264" y2="172" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="255" y1="161" x2="273" y2="161" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="286" y="150" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="295" y1="150" x2="295" y2="172" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="286" y1="161" x2="304" y2="161" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="317" y="150" width="18" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="326" y1="150" x2="326" y2="172" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <line x1="317" y1="161" x2="335" y2="161" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            {/* Center tower windows */}
            <rect x="175" y="95" width="10" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="180" y1="95" x2="180" y2="117" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <rect x="215" y="95" width="10" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="220" y1="95" x2="220" y2="117" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            <rect x="175" y="122" width="10" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="180" y1="122" x2="180" y2="144" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />
            <rect x="215" y="122" width="10" height="22" fill="none" stroke="#4ba4e3" strokeWidth="1" opacity="0.4" />
            <line x1="220" y1="122" x2="220" y2="144" stroke="#4ba4e3" strokeWidth="0.7" opacity="0.4" />

            {/* Tree Left */}
            <path d="M 25,180 L 25,160 M 25,160 C 15,160 10,145 25,135 C 20,120 35,110 40,125 C 45,115 55,120 50,135 C 60,140 55,160 25,160" fill="none" stroke="#4ba4e3" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            {/* Tree Right */}
            <path d="M 375,180 L 375,160 M 375,160 C 365,160 360,145 375,135 C 370,120 385,110 390,125 C 395,115 405,120 400,135 C 410,140 405,160 375,160" fill="none" stroke="#4ba4e3" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
          </svg>
        </div>
      </div>

      {/* Right login form */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <div style={{ marginBottom: 40 }}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSubtitle}>Sign in to continue to your dashboard</p>
          </div>

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="email"
              rules={[{ required: true, message: 'Please enter your email' }]}
            >
              <CustomLoginInput
                icon={<MailOutlined />}
                placeholder="Email Address"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <CustomLoginInput
                icon={<LockOutlined />}
                type="password"
                placeholder="Password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              style={styles.primaryBtn}
            >
              Sign In
            </Button>
          </Form>

          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              Developed by Kodex Infosolutions
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
              © 2026 Kodex Infosolutions. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Public Sans', sans-serif",
  },
  leftPanel: {
    flex: '0 0 45%',
    background: 'linear-gradient(180deg, #001f3f 0%, #001224 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: '48px 24px 48px 24px',
  },
  brandContent: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transform: 'translateY(-20px)', // subtle upward nudge for perfect visual balance
  },
  logoWrapper: {
    width: 180,
    height: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  logo: {
    height: '100%',
    maxWidth: '100%',
    width: 'auto',
    objectFit: 'contain',
    borderRadius: '50%',
    padding: '4px',
    backgroundColor: '#fff',
  },
  brandTitle: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: '26px',
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 16px',
    lineHeight: 1.3,
    letterSpacing: '-0.02em',
  },
  brandSubtitle: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '2.5px',
    color: '#38bdf8', // beautiful light blue text
    fontWeight: 800,
    margin: '0 0 24px',
  },
  brandDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    lineHeight: 1.6,
    margin: 0,
    fontWeight: 400,
    maxWidth: '360px',
  },
  schoolSvgContainer: {
    position: 'absolute',
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '380px',
    opacity: 0.85,
    pointerEvents: 'none',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: '48px 24px',
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
  },
  formTitle: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: 32,
    fontWeight: 800,
    color: '#051d38',
    margin: '0 0 8px',
    letterSpacing: '-0.02em',
  },
  formSubtitle: {
    color: '#475569',
    fontSize: 14,
    margin: 0,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#eaeef2',
    borderRadius: '16px',
    padding: '8px',
    width: '100%',
    height: '62px',
    gap: '10px',
  },
  inputIcon: {
    fontSize: '20px',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '12px',
    marginRight: '4px',
    flexShrink: 0,
  },
  whiteInputContainer: {
    flex: 1,
    height: '46px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerWhiteInput: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    padding: '0 16px',
    fontSize: '14px',
    color: '#0f172a',
  },
  primaryBtn: {
    background: '#051c33',
    borderColor: '#051c33',
    color: 'white',
    borderRadius: '16px',
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    height: 52,
    marginTop: 16,
    boxShadow: '0 4px 12px rgba(5, 28, 51, 0.15)',
    transition: 'all 0.3s ease',
  },
}

export default Login