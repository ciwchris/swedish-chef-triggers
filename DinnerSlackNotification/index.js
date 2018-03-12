var azure = require('azure-storage');
var got = require('got');

//https://blogs.msdn.microsoft.com/webdev/2017/12/21/take-a-break-with-azure-functions/
module.exports = function (context, myTimer) {
    var conversationId = process.env['ConversationId'];
    var botId = process.env['BotId'];
    var tableName = process.env['StorageTable'];
    var storageKey = process.env['AzureWebJobsStorage'];
    var giphyApiKey = process.env['GiphyApiKey'];

    var tableSvc = azure.createTableService(storageKey);
    var query = new azure.TableQuery().where("PartitionKey eq ?", "dinner");
    tableSvc.queryEntities(tableName, query, null, function(error, result, response) {
        if(error) throw error;

        var index = 0;
        var meal = result.entries.reduce((oldestMeal, meal) => {
            return parseInt(meal.LastEatten._) <= (oldestMeal.lastEatten || parseInt(oldestMeal.LastEatten._))
            ? { lastEatten: parseInt(meal.LastEatten._),
                menu: meal.RowKey._,
                tag: meal.Tag._ }
            : oldestMeal;
        });

        var menu = meal.menu || meal.RowKey._;
        var task = {
            PartitionKey: {'_':'dinner'},
            RowKey: {'_': menu},
            LastEatten: {'_':((Date.now() * 10000) + 621355968000000000)},
            Tag: {'_': meal.tag},
        };
        tableSvc.replaceEntity(tableName, task, function(error, result, response){
            if(error) throw error;
        });
        context.log('meal: ' + menu);

        got('https://api.giphy.com/v1/gifs/random?tag=' + encodeURIComponent(meal.tag) + '&rating=g&api_key=' + giphyApiKey, { json: true }).then(response => {
          sendMessage(menu, response.body.data.fixed_height_downsampled_url)
        }).catch(error => {
          context.log(error);
          sendMessage(menu, 'https://media0.giphy.com/media/demgpwJ6rs2DS%2Fgiphy-downsized.gif')
        });

    });

    function sendMessage(messageText, imageUrl) {
        var slackbotUrl = process.env['SlackbotUrl'];
        var slackOAuthToken = process.env['SlackOAuthToken'];
        var channelToNotify = process.env['ChannelToNotify'];

        context.log('sending');

        got(slackbotUrl, {
            method: 'POST',
            json: true,
            headers: {
                'Authorization':'Bearer ' + slackOAuthToken
            },
            body: {
                "channel": channelToNotify,
                "text": "This week's dinner is…",
                "attachments": [
                    {
                        "title": messageText,
                        "text": "Bork bork bork!",
                        "image_url": imageUrl,
                    }
                ]
            }
        }).then(response => {
            context.log('sent success');
            context.done();
        }).catch(error => {
            context.log(error);
            context.done();
        });
    }
}

