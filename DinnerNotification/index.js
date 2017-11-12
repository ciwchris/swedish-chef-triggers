module.exports = function (context, myTimer) {
    var conversationId = process.env['ConversationId'];
    var botId = process.env['BotId'];

    var address = {
        'conversation':{'id': conversationId},
        'channelId':'slack',
        'bot':{'id': botId,'name':'swedishchef'},
        'serviceUrl':'https://slack.botframework.com'
    };
      
    context.bindings.dinnerQueueItem = {
        address: address,
        text:'Using config'
    }; 
    
    context.done();
};
