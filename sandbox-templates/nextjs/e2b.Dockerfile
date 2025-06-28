# You can use most Debian-based base images
FROM node:22-slim

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /home/user/compile_page.sh
RUN chmod +x /home/user/compile_page.sh

# Install dependencies and customize sandbox
WORKDIR /home/user/nextjs-app

RUN npx --yes create-next-app@15.3.3 . --yes

RUN for i in 1 2 3; do npx --yes shadcn@2.6.3 init --yes -b neutral --force && break || sleep 5; done
RUN for i in 1 2 3; do npx --yes shadcn@2.6.3 add --all --yes && break || sleep 5; done

# Move the Nextjs app to the home directory and remove the nextjs-app directory
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app