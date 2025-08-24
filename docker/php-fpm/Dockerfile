FROM php:8.0-fpm

ARG user=appuser
ARG group=appuser
ARG uid=1000
ARG gid=1000
RUN groupadd -g ${gid} ${group} && useradd -m -u ${uid} -g ${group} -s /bin/sh ${user}

RUN apt-get update && apt-get install -y \
    libzip-dev unzip libonig-dev libpng-dev

RUN docker-php-ext-install pdo pdo_mysql zip mbstring gd

# install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

USER ${user}
