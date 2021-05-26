<!doctype html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
          integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
    <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
            integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous">
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js"
            integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous">
    </script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js"
            integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous">
    </script>
    <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
</head>

<body>
<div id="accordion" class="row mr-0 ml-0">
    @foreach ($days as $day)
        <div class="card col text-center">
            <div class="card-header" id="heading{{ $day }}">
                <h5 class="mb-0">
                    <button class="btn btn-link" data-toggle="collapse" data-target="#collapse{{ $day }}"
                            aria-expanded="@if ($day==$days[0]) true @endif" aria-controls="collapse{{ $day }}">
                        Day {{ $day }}
                    </button>
                </h5>
            </div>
        </div>
    @endforeach
    <div>
        @foreach ($days as $day)
            <div id="collapse{{ $day }}" class="collapse @if ($day==$days[0]) show @endif"
                 aria-labelledby="heading{{ $day }}"
                 data-parent="#accordion">
                <div class="card-body">
                    @if($day == 1)
                        <form action="{{ route('vocabulary.store') }}" method="post">
                            @csrf
                            <div class="form-group row">
                                <label for="english" class="col-sm-2 col-form-label">English</label>
                                <div class="col-sm-10">
                                    <input type="text" class="form-control" id="english" name="english"
                                           placeholder="English">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label for="vietnamese" class="col-sm-2 col-form-label">Vietnamese</label>
                                <div class="col-sm-10">
                                    <input type="text" class="form-control" id="vietnamese" name="vietnamese"
                                           placeholder="Vietnamese">
                                </div>
                            </div>
                            <button class="btn" type="submit">Create</button>
                        </form>
                    @endif
                    <table class="table table-bordered mt-1">
                        <thead class="thead-light text-center">
                        <tr>
                            <th scope="col">#</th>
                            <th scope="col">ENGLISH</th>
                            <th scope="col">SPELL</th>
                            <th scope="col">VIETNAMESE</th>
                            <th scope="col">ACTION</th>
                        </tr>
                        </thead>
                        <tbody>
                        @foreach ($vocabularyDays[$day] as $key => $vocabulary)
                            <tr>
                                <th scope="row" class="text-center">{{ $key + 1 }}</th>
                                <td>{{ $vocabulary->english }}</td>
                                <td>
                                    @foreach($vocabulary->spell as $nation => $spell)
                                        {{ $nation }}: {{ $spell }}<br>
                                    @endforeach
                                </td>
                                <td>
                                    <div id="vocabulary{{ $vocabulary->id }}"
                                         data-id="{{ $vocabulary->id }}"
                                         class="collapse vocabularyVietNamese{{ $day }}">
                                        {{ $vocabulary->vietnamese }}
                                    </div>
                                </td>
                                <td>
                                    <button id="{{ $vocabulary->id }}" class="btn showVocabulary"
                                            data-toggle="collapse" data-target="#vocabulary{{ $vocabulary->id }}"
                                            aria-expanded="false"
                                            aria-controls="vocabulary{{ $vocabulary->id }}">
                                        Show
                                    </button>
                                    <button class="btn btn-danger deleteVocabulary{{ $day }}" type="button"
                                            data-id="{{ $vocabulary->id }}">Delete
                                    </button>
                                </td>
                            </tr>
                        @endforeach
                        <tr>
                        </tbody>
                    </table>
                    <button class="btn submit{{ $day }}" type="button">Submit</button>
                    <a href="{{ route('vocabulary.mergesound', $day) }}" class="btn" type="button">Merge Sound</a>
                        Anim pariatur cliche reprehenderit, enim eiusmod high life accusamus terry richardson ad squid.
                    3 wolf moon officia aute, non cupidatat skateboard dolor brunch. Food truck quinoa nesciunt
                    laborum eiusmod. Brunch 3 wolf moon tempor, sunt aliqua put a bird on it squid single-origin
                    coffee nulla assumenda shoreditch et. Nihil anim keffiyeh helvetica, craft beer labore wes
                    anderson cred nesciunt sapiente ea proident. Ad vegan excepteur butcher vice lomo. Leggings
                    occaecat craft beer farm-to-table, raw denim aesthetic synth nesciunt you probably haven't heard
                    of them accusamus labore sustainable VHS.
                </div>
            </div>
        @endforeach
    </div>
</div>
</body>
<script>
    $(document).ready(function () {
        var day = [1, 2, 3, 4, 5]
        $.each(day, function (key, value) {
            $('.submit' + value).click(function () {
                var idVocabulary = [];
                $('.vocabularyVietNamese' + value).each(function () {
                    if ($(this).is(':visible')) {
                        idVocabulary.push($(this).attr('data-id'));
                    }
                });
                $.ajax({
                    type: "POST",
                    url: 'vocabulary/forward',
                    data: {
                        '_token': "{{ csrf_token() }}",
                        'idVocabulary': idVocabulary,
                        'day': value,
                    },
                    success: function () {
                        location.reload();
                    }
                })
            });

            $('.deleteVocabulary' + value).click(function () {
                var idVocabulary = $(this).attr('data-id')
                $.ajax({
                    type: "DELETE",
                    url: 'vocabulary/' + idVocabulary,
                    data: {
                        '_token': "{{ csrf_token() }}",
                        'day': value,
                    },
                    success: function () {
                        location.reload();
                    }
                })
            });

            $('.mergesound' + value).click(function () {
                $.ajax({
                    type: "POST",
                    url: 'vocabulary/mergesound',
                    data: {
                        '_token': "{{ csrf_token() }}",
                        'day': value,
                    },
                    // success: function () {
                    //     location.reload();
                    // }
                })
            });
        })
    })
</script>

</html>
