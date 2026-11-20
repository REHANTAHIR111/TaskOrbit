<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>TaskOrbit | Smart Time. Better Work.</title>

    <link rel="logo" href="/assets/images/logo/logo-light.png">

    <link href="https://fonts.googleapis.com/css?family=Nunito:400,600,700" rel="stylesheet">

    @viteReactRefresh
    @vite(['resources/js/src/main.tsx'])
</head>

<body class='bg-black'>
    <noscript>
        <strong>We're sorry but Task Orbit doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
    </noscript>

    <div id="root"></div>
</body>

</html>
