var azure = require('azure-storage');

module.exports = function (context, myTimer) {
    var conversationId = process.env['ConversationId'];
    var botId = process.env['BotId'];
    var tableName = process.env['StorageTable'];
    var storageKey = process.env['AzureWebJobsStorage'];

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

        var address = {
            'conversation':{'id': conversationId},
            'channelId':'slack',
            'bot':{'id': botId,'name':'swedishchef'},
            'serviceUrl':'https://slack.botframework.com'
        };
          
        context.bindings.dinnerQueueItem = {
            address: address,
            text: meal.tag + ':' + menu
        }; 
        
        context.done();
    });

};
