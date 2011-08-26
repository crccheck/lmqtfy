if (!Storage.prototype.setObject){
  Storage.prototype.setObject = function(key, value) {
      this.setItem(key, JSON.stringify(value));
  }
}
if (!Storage.prototype.getObject){
  Storage.prototype.getObject = function(key, def) {
    return this.getItem(key) && JSON.parse(this.getItem(key)) || def || {};
  }
}





var options = {
  size: 0,
  template: '<li><input class="name" type="text"><span class="icon delete">Delete</span></li>',
  elem: $('#options'),
  graph: $('#graph'),
  add: function(name){
    name = name || '';
    ++options.size;
    options.elem.find('ul')
      .append(
        $(options.template).find('input.name').change(options.updateOptionLabels).val(name).end()
      );
    
    // add an option to every criteria
    criteria.elem.find('ul').each(function() { criteria._addOption($(this)); });
    
    // add option to the graph
    $('<div><h3 class="label">'+name+'</h3><span class="bar"></span><input class="value" readonly type="text"></div>').appendTo(options.graph);
    
    options.save();
  },
  remove: function(e){
    $(this).parent().remove();
    $('#graph > div:last').remove();  //remove any graph, it gets redrawn anyways
    --options.size;
    var i = $('#options .icon.delete').index(this);
    $('#criterias ul').each(function(){
      $(this).children('li').eq(i).remove();
    });
    options.save();
    criteria.save();
  },
  list: function(){ return this.elem.find('ul input').map(function(){ return this.value; }).toArray(); },
  updateOptionLabels: function(scope){
    var list = options.list();
    $('#criterias .criteria').each(function(){
      $(this).find('li').each(function(i){
        $(this).find('.label').text(list[i]);
      });
    });
    $('#graph .label').each(function(i){
      $(this).text(list[i]);
    });
    options.save();
  },
  updateOptionGraph: function(){
    var totals = [];
    var bars = $('#graph .bar');
    $('#criterias .criteria').each(function(i_criteria){
      var weight = $(this).find('h2 > input.value').val();
      $(this).find('li').each(function(i){
        if (totals[i] == undefined) totals[i] = 0;
        var width = weight/100 * +$(this).find('.value > input').val();
        totals[i] += width;
        $(bars).eq(i).children().eq(i_criteria).css('width',width + 'px');
      });
    });
    $('#graph .value').each(function(i){
      $(this).val(Math.round(totals[i]));
    });
  },
  save : function(){
    var output = options.list();
    localStorage.setObject('options',output);
    $('#debug').text(JSON.stringify(output));
  }
};

var criteria = {
  size: 0,
  optionTemplate: '<li><div class="label"></div><div class="slider"></div><div class="value"><input type="text"></div></li>',
  elem: $('#criterias'),
  add: function(def){
    ++criteria.size;
    var junk = $('<div class="criteria"><div class="weight"></div><header><h2><input class="label" type="text"><span class="icon delete">Delete</span><input class="value" type="text"></h2></header><ul></ul><footer></footer></div>')
      .find('h2 > input.label').change(criteria.save).val(def && def.name || '').end()
      .appendTo(criteria.elem);
    var stuff = junk.find('ul'),
        weightSlider = junk.find('div.weight');
    weightSlider.slider({
          value: def && def.weight || 100,
          orientation: "vertical",
          slide: function(event, ui){
            $(ui.handle).closest('div.criteria').find('h2 > input.value').val(ui.value);
            options.updateOptionGraph();
          },
          change: criteria.save
        });
    junk.find('h2 > input.value').change(function(){ weightSlider.slider('value',this.value); options.updateOptionGraph(); }).val(weightSlider.slider('value'));
    if (def && def.values.length == options.size) {
      def.values.forEach(function(value){
        criteria._addOption(stuff,+value);
      });
    } else {
      for (var i = options.size; i; --i)
        this._addOption(stuff);
    }
    var bars = [];
    $('#graph span.bar').each(function(){
      bars.push($('<b style="width:0px;">&nbsp;</b>').appendTo(this));
    });
    junk.hover(function(){
      bars.forEach(function(bar){
        bar.css('background','cyan');
      });
    },function(){
      bars.forEach(function(bar){
        bar.css('background','transparent');
      });
    });
    

    options.updateOptionLabels();
    options.updateOptionGraph();
    criteria.save();
  },
  //add the option template to the parent UL el
  _addOption: function(el,defValue){
    var child = $(criteria.optionTemplate)
    .find('.slider').slider({
      value: defValue === undefined ? 50 : defValue,
      slide: function(event, ui){
        $(ui.handle).parent().next().find('input').val(ui.value);
        options.updateOptionGraph();
      },
      change: criteria.save
    }).end();
    
    child.appendTo(el);
    child.find('div.value > input').val(child.find('.slider').slider('value'));
    
  },
  save:function(){
    var output = criteria.elem.find('.criteria').map(function(){
      return {
        name: $(this).find('h2 > input.label').val(),
        weight: +$(this).find('h2 > input.value').val(),
        values: $(this).find('div.value > input').map(function(){ return +this.value; }).toArray()
      }    
    }).toArray();
    localStorage.setObject('criteria',output);
    $('#debug2').text(JSON.stringify(output));
  }
};

//*********hook up event handlers************
// add options
$('#addOption').click(function() { options.add(); return false; });
// add criteria
$('#addCriteria').click(function() { criteria.add(); return false; });
// options are deleted
$('#options .icon.delete').live('click',options.remove);
// criteria values are manually changed
$('#criterias div.value > input').live('change',function(){
  slider = $(this).parent().prev().slider("value",this.value);
  options.updateOptionGraph();
  criteria.save();
});
// criteria are deleted
$('#criterias .icon.delete').live('click',function(){
  $(this).closest('.criteria').remove();
  --criteria.size;
  criteria.save();
});

//load data
localStorage.getObject('options',[]).forEach(function(option){
  options.add(option);
});
if (!options.size) {
  options.add();options.add();  // add 2 options initially
}
localStorage.getObject('criteria',[]).forEach(function(def){
  criteria.add(def);
});
if (!criteria.size) {
  criteria.add(); // add 1 criteria initially
}

$('#criterias').sortable({
  items: '> div',
  change: criteria.save
});