=========================================================
Pre-reqs:
=========================================================

Wifi connected

SD Card with latest Weezy OS installed

Raspberry Pi Camera

SSH setup

=========================================================
Step 1 - Make sure your Raspberry Pi is up to date:
=========================================================

sudo apt-get install rpi-update

sudo rpi-update

=========================================================
Step 2 - Make sure all your packages are up to date:
=========================================================

sudo apt-get update

sudo apt-get upgrade

=========================================================
Step 3 - Disable the cameras LED:
=========================================================

sudo nano /boot/config.txt

disable_camera_led=1

=========================================================
Step 4 - Install motion detection software:
=========================================================

sudo apt-get install motion

cd /tmp 

sudo apt-get install -y libjpeg62 libjpeg62-dev libavformat53 libavformat-dev libavcodec53 libavcodec-dev libavutil51 libavutil-dev libc6-dev zlib1g-dev libmysqlclient18 libmysqlclient-dev libpq5 libpq-dev

wget https://www.dropbox.com/s/xdfcxm5hu71s97d/motion-mmal.tar.gz 

tar zxvf motion-mmal.tar.gz  

sudo mv motion /usr/bin/motion

sudo mv motion-mmalcam.conf /etc/motion.conf 

sudo nano /etc/default/motion

start_motion_daemon=yes

sudo chmod 664 /etc/motion.conf

sudo chmod 755 /usr/bin/motion

sudo touch /tmp/motion.log

sudo chmod 775 /tmp/motion.log 

sudo nano /etc/motion.conf  


daemon on
logfile /tmp/motion.log
width 1280
height 720 
framerate 2 
pre_capture 2
post_capture 2 
max_mpeg_time 600 
ffmpeg_video_codec msmpeg4
stream_localhost off
stream_auth_method 2  
stream_authentication SOMEUSERNAME:SOMEPASSWORD 

sudo reboot

=========================================================
Step 5 - Fix motion autostart:
=========================================================

sudo nano /etc/init.d/motion

Before the line "log_daemon_msg "Starting...." add the following line

sleep 30
