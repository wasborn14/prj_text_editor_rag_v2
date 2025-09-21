# Project History

## 2025-09-21: VPS Setup and Security Configuration

### Initial Setup
- **VPS Provider**: ConoHa VPS
- **Plan**: 2Core / 1GB RAM / 100GB SSD
- **OS**: Ubuntu 24.04
- **IP Address**: 160.251.211.37
- **Cost**: 6,092円 (12 months)

### Challenges Encountered

#### 1. Initial Login Issues
- **Problem**: Could not login via console after VPS creation
- **Cause**: Password setup issues during initial configuration
- **Solution**: Rebuilt VPS with simpler password, then changed later

#### 2. SSH Connection Failed
- **Problem**: Could not SSH from local machine despite correct credentials
- **Cause**: ConoHa security group not configured
- **Solution**: Selected "IPv4v6-SSH" security group in ConoHa control panel

#### 3. Password Authentication Could Not Be Disabled
- **Problem**: `PasswordAuthentication no` in sshd_config but still accepting passwords
- **Cause**: `/etc/ssh/sshd_config.d/50-cloud-init.conf` overriding settings
- **Solution**: Renamed cloud-init config file to `.backup` to disable it

#### 4. SSH Service Interruption
- **Problem**: SSH service stopped when disabling ssh.socket
- **Cause**: Incorrect order of operations when modifying systemd units
- **Solution**: Used ConoHa console to restore SSH service

### Security Configuration Completed

#### SSH Hardening
- ✅ SSH key authentication configured (id_conoha_rag_202509)
- ✅ Password authentication disabled
- ✅ Root login disabled
- ✅ Created non-root user (wasborn) with sudo privileges

#### System Setup
- ✅ Docker and Docker Compose installed
- ✅ Firewall configured (ufw)
- ✅ fail2ban installed for brute force protection
- ✅ Timezone set to Asia/Tokyo

### GitHub Repository
- **URL**: https://github.com/wasborn14/prj_text_editor_rag_v1
- **Authentication**: Personal Access Token configured
- **Push**: Successfully pushed initial code

### Key Commands Used

```bash
# SSH key generation
ssh-keygen -t ed25519 -f ~/.ssh/id_conoha_rag_202509 -C "conoha-rag-project-202509"

# SSH key copy
ssh-copy-id -i ~/.ssh/id_conoha_rag_202509.pub root@160.251.211.37

# User creation
adduser wasborn
usermod -aG sudo wasborn

# SSH configuration fix
mv /etc/ssh/sshd_config.d/50-cloud-init.conf /etc/ssh/sshd_config.d/50-cloud-init.conf.backup
systemctl restart ssh

# Docker installation
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Lessons Learned

1. **Always check cloud provider's security groups first** - This was the primary cause of SSH connection issues
2. **Ubuntu 24.04 uses sshd_config.d directory** - Configuration files here can override main sshd_config
3. **Test SSH changes with active session** - Always keep one connection open when modifying SSH settings
4. **Document passwords and configurations immediately** - Prevents login lockouts
5. **Use non-root user for production** - Better security practice

### Current Status
- VPS fully configured and secured
- Ready for RAG API deployment
- All security best practices implemented

### Next Steps
- [ ] Deploy RAG API using Docker Compose
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificate
- [ ] Implement monitoring and logging